package com.arqon.core.questionbank.service;

import com.arqon.common.api.PageResponse;
import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.questionbank.domain.Difficulty;
import com.arqon.core.questionbank.domain.Question;
import com.arqon.core.questionbank.domain.QuestionContent;
import com.arqon.core.questionbank.domain.QuestionRepository;
import com.arqon.core.questionbank.domain.QuestionStatus;
import com.arqon.core.questionbank.domain.QuestionType;
import com.arqon.core.questionbank.domain.QuestionVersion;
import com.arqon.core.questionbank.domain.QuestionVersionRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * All methods run inside a transaction scoped to ONE tenant (taken from the verified token by the controller).
 * Row-Level Security makes other tenants' questions invisible, so they look like "not found".
 */
@Service
public class QuestionService {

    public record Detail(Question question, QuestionVersion version) {}

    private final QuestionRepository questions;
    private final QuestionVersionRepository versions;
    private final RlsSession rls;

    public QuestionService(QuestionRepository questions, QuestionVersionRepository versions, RlsSession rls) {
        this.questions = questions;
        this.versions = versions;
        this.rls = rls;
    }

    @Transactional
    public Detail create(UUID tenant, UUID userId, QuestionDraft draft) {
        rls.asTenant(tenant);
        QuestionContentValidator.validate(draft);
        List<String> tags = normalizeTags(draft.tags());
        String title = draft.title().trim();

        Question question = questions.saveAndFlush(new Question(tenant, draft.type(), title, draft.difficulty(), tags, userId));
        QuestionVersion version = versions.save(
                new QuestionVersion(question.getId(), tenant, 1, title, draft.body(), draft.difficulty(), contentOf(draft), userId));
        return new Detail(question, version);
    }

    @Transactional(readOnly = true)
    public PageResponse<Question> list(UUID tenant, QuestionType type, Difficulty difficulty, String tag, String search, int page, int size) {
        rls.asTenant(tenant);
        Page<Question> result = questions.search(
                type == null ? null : type.name(),
                difficulty == null ? null : difficulty.name(),
                blankToNull(tag) == null ? null : tag.trim().toLowerCase(Locale.ROOT),
                blankToNull(search),
                PageRequest.of(page, size));
        return new PageResponse<>(result.getContent(), page, size, result.getTotalElements());
    }

    /** version == null means the current version. Archived questions stay readable (assessments may reference them). */
    @Transactional(readOnly = true)
    public Detail get(UUID tenant, UUID id, Integer version) {
        rls.asTenant(tenant);
        Question question = find(id);
        int wanted = version == null ? question.getCurrentVersion() : version;
        QuestionVersion v = versions.findByQuestionIdAndVersion(id, wanted)
                .orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Question version not found"));
        return new Detail(question, v);
    }

    @Transactional(readOnly = true)
    public List<QuestionVersion> history(UUID tenant, UUID id) {
        rls.asTenant(tenant);
        find(id);
        return versions.findByQuestionIdOrderByVersionDesc(id);
    }

    /** Never edits in place: appends version n+1. expectedVersion guards against lost updates (optimistic concurrency). */
    @Transactional
    public Detail newVersion(UUID tenant, UUID userId, UUID id, QuestionDraft draft) {
        rls.asTenant(tenant);
        if (draft.expectedVersion() == null) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "expectedVersion is required");
        }
        Question question = find(id);
        if (question.getStatus() == QuestionStatus.ARCHIVED) {
            throw new ArqonException(ErrorCode.CONFLICT, "Question is archived");
        }
        if (draft.type() != question.getType()) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Question type cannot be changed");
        }
        if (draft.expectedVersion() != question.getCurrentVersion()) {
            throw new ArqonException(ErrorCode.CONFLICT, "The question was modified by someone else. Reload and retry.");
        }
        QuestionContentValidator.validate(draft);

        int next = question.getCurrentVersion() + 1;
        String title = draft.title().trim();
        try {
            QuestionVersion version = versions.saveAndFlush(
                    new QuestionVersion(id, tenant, next, title, draft.body(), draft.difficulty(), contentOf(draft), userId));
            question.applyNewVersion(next, title, draft.difficulty(), normalizeTags(draft.tags()));
            questions.saveAndFlush(question);
            return new Detail(question, version);
        } catch (DataIntegrityViolationException e) {
            throw new ArqonException(ErrorCode.CONFLICT, "The question was modified by someone else. Reload and retry.");
        }
    }

    /** Soft delete: hidden from lists, versions kept so existing assessments stay valid. */
    @Transactional
    public void archive(UUID tenant, UUID id) {
        rls.asTenant(tenant);
        Question question = find(id);
        question.archive();
        questions.save(question);
    }

    private Question find(UUID id) {
        return questions.findById(id).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Question not found"));
    }

    private static QuestionContent contentOf(QuestionDraft d) {
        return d.type() == QuestionType.MCQ ? new QuestionContent(d.mcq(), null) : new QuestionContent(null, d.coding());
    }

    static List<String> normalizeTags(List<String> raw) {
        if (raw == null) {
            return List.of();
        }
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        for (String t : raw) {
            if (t != null && !t.isBlank()) {
                tags.add(t.trim().toLowerCase(Locale.ROOT));
            }
        }
        return List.copyOf(tags);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
