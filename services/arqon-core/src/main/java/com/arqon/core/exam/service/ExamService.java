package com.arqon.core.exam.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.security.Tokens;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.assessment.AssessmentApi;
import com.arqon.core.assessment.AssessmentApi.Blueprint;
import com.arqon.core.exam.api.ExamViews.SavedView;
import com.arqon.core.exam.api.ExamViews.SessionView;
import com.arqon.core.exam.api.ExamViews.SubmittedView;
import com.arqon.core.exam.domain.Answer;
import com.arqon.core.exam.domain.ExamSession;
import com.arqon.core.exam.domain.ExamSessionRepository;
import com.arqon.core.exam.domain.ExamStatus;
import com.arqon.core.exam.domain.Snapshot;
import com.arqon.core.invitation.InvitationApi;
import com.arqon.core.invitation.InvitationApi.InvitationInfo;
import com.arqon.core.questionbank.QuestionBankApi;
import com.arqon.core.questionbank.QuestionBankApi.QuestionSnapshot;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Candidate side of an exam. The SERVER owns time: the deadline is computed once at start and stored; every write is
 * checked against it and an overdue session is finalized (auto-submitted) no matter what the browser says.
 * Candidates authenticate with an opaque session token (only its SHA-256 is stored); starting again from the invitation
 * link resumes the same session and rotates that token, so only the latest device can write.
 */
@Service
public class ExamService {

    private static final String INVALID_INVITE = "This invitation link is invalid or has expired.";
    private static final String INVALID_SESSION = "Your exam session is not valid. Open your invitation link again.";
    static final Duration GRACE = Duration.ofSeconds(5); // network latency allowance for the last autosave
    static final int MAX_CODE_CHARS = 100_000;

    private final ExamSessionRepository sessions;
    private final AnswerStore answers;
    private final ExamAudit audit;
    private final RlsSession rls;
    private final InvitationApi invitations;
    private final AssessmentApi assessments;
    private final QuestionBankApi questionBank;

    public ExamService(ExamSessionRepository sessions, AnswerStore answers, ExamAudit audit, RlsSession rls,
                       InvitationApi invitations, AssessmentApi assessments, QuestionBankApi questionBank) {
        this.sessions = sessions;
        this.answers = answers;
        this.audit = audit;
        this.rls = rls;
        this.invitations = invitations;
        this.assessments = assessments;
        this.questionBank = questionBank;
    }

    @Transactional(noRollbackFor = ArqonException.class)
    public SessionView start(String inviteToken, String ip) {
        InvitationInfo inv = invitations.findUsable(inviteToken).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, INVALID_INVITE));
        rls.asSystem();
        Instant now = Instant.now();
        String token = Tokens.newToken();

        ExamSession existing = sessions.findByInvitationId(inv.invitationId()).orElse(null);
        if (existing != null) {
            existing = finalizeIfOverdue(existing, now);
            if (!existing.isOpen()) {
                throw new ArqonException(ErrorCode.CONFLICT, "This exam has already been submitted.");
            }
            existing.rotateToken(Tokens.sha256Hex(token));
            sessions.saveAndFlush(existing);
            audit.record(existing.getTenantId(), "exam.resumed", existing.getId(), ip);
            return SessionView.of(token, existing, answers.load(existing.getId()), now);
        }

        Blueprint bp = assessments.blueprint(inv.tenantId(), inv.assessmentId())
                .filter(b -> b.info().published()).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, INVALID_INVITE));
        var info = bp.info();
        if (now.isBefore(info.windowStart())) {
            throw new ArqonException(ErrorCode.CONFLICT, "This assessment has not started yet. It opens at " + info.windowStart() + ".");
        }
        if (!now.isBefore(info.windowEnd())) {
            throw new ArqonException(ErrorCode.CONFLICT, "This assessment window has ended.");
        }
        Instant deadline = info.fixedWindow() ? info.windowEnd() : min(now.plus(Duration.ofMinutes(info.durationMinutes())), info.windowEnd());

        ExamSession session = new ExamSession(inv.tenantId(), inv.invitationId(), inv.assessmentId(), inv.candidateEmail(),
                Tokens.sha256Hex(token), now, deadline, snapshot(inv, bp));
        sessions.saveAndFlush(session);
        audit.record(session.getTenantId(), "exam.started", session.getId(), ip);
        audit.outbox(session.getTenantId(), session.getId(), "exam.started", Map.of("sessionId", session.getId().toString(),
                "assessmentId", session.getAssessmentId().toString(), "deadlineAt", deadline.toString()));
        return SessionView.of(token, session, Map.of(), now);
    }

    @Transactional
    public SessionView view(String sessionToken) {
        Instant now = Instant.now();
        ExamSession s = finalizeIfOverdue(load(sessionToken), now);
        return SessionView.of(null, s, s.isOpen() ? answers.load(s.getId()) : Map.of(), now);
    }

    @Transactional(noRollbackFor = ArqonException.class)
    public SavedView save(String sessionToken, UUID questionId, Answer answer) {
        Instant now = Instant.now();
        ExamSession s = load(sessionToken);
        if (s.isOpen() && now.isAfter(s.getDeadlineAt().plus(GRACE))) {
            finalizeSession(s, ExamStatus.AUTO_SUBMITTED, now); // committed even though we then reject (noRollbackFor)
        }
        if (!s.isOpen()) {
            throw new ArqonException(ErrorCode.CONFLICT, "The exam is over. Your answers are saved.");
        }
        Snapshot.Item item = s.getSnapshot().sections().stream().flatMap(sec -> sec.items().stream())
                .filter(i -> i.questionId().equals(questionId)).findFirst()
                .orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Question not found in this exam"));
        validate(item, s.getSnapshot(), answer);
        answers.upsert(s.getTenantId(), s.getId(), questionId, normalize(item, answer));
        return new SavedView(now, s.getDeadlineAt());
    }

    @Transactional
    public SubmittedView submit(String sessionToken, String ip) {
        Instant now = Instant.now();
        ExamSession s = load(sessionToken);
        if (s.isOpen()) {
            finalizeSession(s, now.isAfter(s.getDeadlineAt().plus(GRACE)) ? ExamStatus.AUTO_SUBMITTED : ExamStatus.SUBMITTED, now);
            audit.record(s.getTenantId(), "exam.submitted", s.getId(), ip);
        }
        return new SubmittedView(s.getStatus().name(), s.getSubmittedAt());
    }

    /** Called by the scheduled sweep (and tests): finalizes sessions whose time is up even if the candidate left. */
    @Transactional
    public int sweepOverdue() {
        rls.asSystem();
        Instant now = Instant.now();
        List<ExamSession> overdue = sessions.findTop100ByStatusAndDeadlineAtBefore(ExamStatus.IN_PROGRESS, now.minus(GRACE));
        overdue.forEach(s -> finalizeSession(s, ExamStatus.AUTO_SUBMITTED, now));
        return overdue.size();
    }

    // ---- internals ----

    private ExamSession load(String sessionToken) {
        if (!Tokens.looksLikeToken(sessionToken)) throw new ArqonException(ErrorCode.UNAUTHENTICATED, INVALID_SESSION);
        rls.asSystem(); // lookup by secret hash; the tenant is then read from the row, never from the caller
        return sessions.findByTokenHash(Tokens.sha256Hex(sessionToken))
                .orElseThrow(() -> new ArqonException(ErrorCode.UNAUTHENTICATED, INVALID_SESSION));
    }

    private ExamSession finalizeIfOverdue(ExamSession s, Instant now) {
        if (s.isOpen() && now.isAfter(s.getDeadlineAt().plus(GRACE))) finalizeSession(s, ExamStatus.AUTO_SUBMITTED, now);
        return s;
    }

    private void finalizeSession(ExamSession s, ExamStatus how, Instant now) {
        var result = Grader.grade(s.getSnapshot(), answers.load(s.getId()));
        s.finish(how, now, result);
        sessions.saveAndFlush(s);
        audit.record(s.getTenantId(), how == ExamStatus.SUBMITTED ? "exam.finished" : "exam.auto_submitted", s.getId(), null);
        audit.outbox(s.getTenantId(), s.getId(), "exam.submitted", Map.of("sessionId", s.getId().toString(),
                "assessmentId", s.getAssessmentId().toString(), "status", how.name()));
    }

    private Snapshot snapshot(InvitationInfo inv, Blueprint bp) {
        List<Snapshot.Sec> secs = new ArrayList<>();
        for (var sec : bp.sections()) {
            List<Snapshot.Item> items = new ArrayList<>();
            for (var it : sec.items()) {
                QuestionSnapshot q = questionBank.snapshot(inv.tenantId(), it.questionId(), it.version())
                        .orElseThrow(() -> new ArqonException(ErrorCode.INTERNAL_ERROR, "A pinned question is missing. Contact the recruiter."));
                items.add(new Snapshot.Item(q.questionId(), q.version(), it.points(), q.kind() == QuestionBankApi.Kind.CODING, q.title(), q.body(),
                        q.options().stream().map(o -> new Snapshot.Opt(o.text(), o.correct())).toList(), q.multipleCorrect(),
                        q.languages().stream().map(Enum::name).filter(bp.allowedLanguages()::contains).toList(),
                        q.starterCode().entrySet().stream().collect(Collectors.toMap(e -> e.getKey().name(), Map.Entry::getValue)),
                        q.visibleSamples().stream().map(x -> new Snapshot.Sample(x.input(), x.expectedOutput())).toList(), q.hiddenTestCount()));
            }
            secs.add(new Snapshot.Sec(sec.title(), sec.coding(), items));
        }
        return new Snapshot(bp.info().title(), bp.info().durationMinutes(), bp.mcqWeight(), bp.codingWeight(), bp.passPercentage(),
                bp.allowedLanguages(), secs);
    }

    static void validate(Snapshot.Item item, Snapshot snap, Answer a) {
        if (a == null) throw new ArqonException(ErrorCode.VALIDATION_ERROR, "answer is required");
        if (item.coding()) {
            if (a.language() == null || !item.languages().contains(a.language())) {
                throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Language is not allowed for this question");
            }
            if (a.code() != null && a.code().length() > MAX_CODE_CHARS) {
                throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Code is too long");
            }
        } else {
            List<Integer> sel = a.selected() == null ? List.of() : a.selected();
            if (sel.stream().anyMatch(i -> i == null || i < 0 || i >= item.options().size())) {
                throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Unknown option selected");
            }
            if (sel.stream().distinct().count() != sel.size()) {
                throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Duplicate options selected");
            }
            if (!item.multipleCorrect() && sel.size() > 1) {
                throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Only one option can be selected");
            }
        }
    }

    private static Answer normalize(Snapshot.Item item, Answer a) {
        return item.coding() ? new Answer(null, a.language(), a.code() == null ? "" : a.code())
                : new Answer(a.selected() == null ? List.of() : List.copyOf(a.selected()), null, null);
    }

    private static Instant min(Instant a, Instant b) {
        return a.isBefore(b) ? a : b;
    }
}
