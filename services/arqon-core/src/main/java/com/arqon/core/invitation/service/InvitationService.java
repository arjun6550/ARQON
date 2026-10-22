package com.arqon.core.invitation.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.security.Tokens;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.assessment.AssessmentApi;
import com.arqon.core.assessment.AssessmentApi.AssessmentInfo;
import com.arqon.core.invitation.config.InvitationProperties;
import com.arqon.core.invitation.domain.Invitation;
import com.arqon.core.invitation.domain.InvitationRepository;
import com.arqon.core.invitation.domain.InvitationStatus;
import com.arqon.core.invitation.mail.InvitationMail;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Recruiter side of invitations. Tenant comes from the verified token; Row-Level Security hides other tenants (404).
 * The raw token exists only in the after-commit mail event; the database keeps its SHA-256.
 */
@Service
public class InvitationService {

    public enum Outcome { CREATED, DUPLICATE, INVALID_EMAIL }

    public record CreateResult(String email, Outcome outcome, UUID invitationId) {}

    static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$");
    public static final int MAX_BATCH = 100;

    private final InvitationRepository invitations;
    private final AssessmentApi assessments;
    private final RlsSession rls;
    private final InvitationAudit audit;
    private final InvitationProperties props;
    private final ApplicationEventPublisher events;

    public InvitationService(InvitationRepository invitations, AssessmentApi assessments, RlsSession rls, InvitationAudit audit,
                             InvitationProperties props, ApplicationEventPublisher events) {
        this.invitations = invitations;
        this.assessments = assessments;
        this.rls = rls;
        this.audit = audit;
        this.props = props;
        this.events = events;
    }

    @Transactional
    public List<CreateResult> create(UUID tenant, UUID userId, UUID assessmentId, List<String> rawEmails, Instant requestedExpiry, String ip) {
        rls.asTenant(tenant);
        if (rawEmails.size() > MAX_BATCH) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "At most " + MAX_BATCH + " invitations per request");
        }
        Instant now = Instant.now();
        AssessmentInfo info = usableAssessment(tenant, assessmentId, now);
        Instant expiry = resolveExpiry(requestedExpiry, info, now);

        List<CreateResult> results = new ArrayList<>();
        for (String email : new LinkedHashSet<>(rawEmails.stream().map(InvitationService::normalize).toList())) {
            if (!isValidEmail(email)) {
                results.add(new CreateResult(email, Outcome.INVALID_EMAIL, null));
                continue;
            }
            if (invitations.existsByAssessmentIdAndCandidateEmailAndStatusNot(assessmentId, email, InvitationStatus.REVOKED)) {
                results.add(new CreateResult(email, Outcome.DUPLICATE, null));
                continue;
            }
            String token = Tokens.newToken();
            Invitation inv = invitations.saveAndFlush(new Invitation(tenant, assessmentId, email, Tokens.sha256Hex(token), expiry, userId));
            audit.record(tenant, userId, "invitation.created", inv.getId(), ip);
            audit.outbox(tenant, inv.getId(), "invitation.created", java.util.Map.of("assessmentId", assessmentId.toString(),
                    "invitationId", inv.getId().toString(), "expiresAt", expiry.toString()));
            events.publishEvent(issued(tenant, inv, info, token));
            results.add(new CreateResult(email, Outcome.CREATED, inv.getId()));
        }
        return results;
    }

    @Transactional(readOnly = true)
    public Page<Invitation> list(UUID tenant, UUID assessmentId, int page, int size) {
        rls.asTenant(tenant);
        assessments.find(tenant, assessmentId).orElseThrow(InvitationService::assessmentNotFound);
        return invitations.findByAssessmentIdOrderByCreatedAtDesc(assessmentId, PageRequest.of(page, size));
    }

    /** New link (the old one stops working immediately). An expired invitation is re-opened until the assessment window ends. */
    @Transactional
    public void resend(UUID tenant, UUID userId, UUID invitationId, String ip) {
        rls.asTenant(tenant);
        Invitation inv = find(invitationId);
        if (inv.getStatus() == InvitationStatus.REVOKED) {
            throw new ArqonException(ErrorCode.CONFLICT, "A revoked invitation cannot be resent. Create a new one.");
        }
        Instant now = Instant.now();
        AssessmentInfo info = usableAssessment(tenant, inv.getAssessmentId(), now);
        Instant expiry = inv.getExpiresAt().isAfter(now) ? inv.getExpiresAt() : info.windowEnd();
        String token = Tokens.newToken();
        inv.rotateToken(Tokens.sha256Hex(token), expiry);
        invitations.saveAndFlush(inv);
        audit.record(tenant, userId, "invitation.resent", inv.getId(), ip);
        events.publishEvent(issued(tenant, inv, info, token));
    }

    @Transactional
    public void revoke(UUID tenant, UUID userId, UUID invitationId, String ip) {
        rls.asTenant(tenant);
        Invitation inv = find(invitationId);
        if (inv.getStatus() != InvitationStatus.REVOKED) {
            inv.revoke(Instant.now());
            invitations.saveAndFlush(inv);
            audit.record(tenant, userId, "invitation.revoked", inv.getId(), ip);
            audit.outbox(tenant, inv.getId(), "invitation.revoked", java.util.Map.of("invitationId", inv.getId().toString()));
        }
    }

    // ---- helpers ----

    private InvitationIssuedEvent issued(UUID tenant, Invitation inv, AssessmentInfo info, String token) {
        String link = props.baseUrl().replaceAll("/+$", "") + "/invite#" + token;
        return new InvitationIssuedEvent(tenant, inv.getId(), new InvitationMail(inv.getCandidateEmail(), info.title(), link,
                info.windowStart(), info.windowEnd(), info.durationMinutes(), inv.getExpiresAt()));
    }

    private AssessmentInfo usableAssessment(UUID tenant, UUID assessmentId, Instant now) {
        AssessmentInfo info = assessments.find(tenant, assessmentId).orElseThrow(InvitationService::assessmentNotFound);
        if (!info.published()) {
            throw new ArqonException(ErrorCode.CONFLICT, "Only published assessments can be used for invitations");
        }
        if (!info.windowEnd().isAfter(now)) {
            throw new ArqonException(ErrorCode.CONFLICT, "The assessment window has already ended");
        }
        return info;
    }

    private static Instant resolveExpiry(Instant requested, AssessmentInfo info, Instant now) {
        if (requested == null) return info.windowEnd();
        if (!requested.isAfter(now.plus(Duration.ofMinutes(1))) || requested.isAfter(info.windowEnd())) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "expiresAt must be in the future and not after the assessment window ends");
        }
        return requested;
    }

    private Invitation find(UUID id) {
        return invitations.findById(id).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Invitation not found"));
    }

    private static ArqonException assessmentNotFound() {
        return new ArqonException(ErrorCode.NOT_FOUND, "Assessment not found");
    }

    static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    static boolean isValidEmail(String email) {
        return email.length() <= 254 && EMAIL.matcher(email).matches();
    }
}
