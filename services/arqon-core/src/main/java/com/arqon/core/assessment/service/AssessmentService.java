package com.arqon.core.assessment.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.assessment.domain.Assessment;
import com.arqon.core.assessment.domain.AssessmentConfig;
import com.arqon.core.assessment.domain.AssessmentRepository;
import com.arqon.core.assessment.domain.AssessmentStatus;
import com.arqon.core.questionbank.QuestionBankApi;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lifecycle: DRAFT (editable) -> PUBLISHED (frozen, also enforced by a DB trigger) -> ARCHIVED.
 * Every method runs for ONE tenant taken from the verified token; Row-Level Security hides other tenants' rows (404).
 */
@Service
public class AssessmentService {

    private static final String CONCURRENT = "The assessment was modified by someone else. Reload and retry.";

    private final AssessmentRepository assessments;
    private final RlsSession rls;
    private final AssessmentValidator validator;

    public AssessmentService(AssessmentRepository assessments, QuestionBankApi questionBank, RlsSession rls) {
        this.assessments = assessments;
        this.rls = rls;
        this.validator = new AssessmentValidator(questionBank);
    }

    @Transactional
    public Assessment create(UUID tenant, UUID userId, AssessmentDraft draft) {
        rls.asTenant(tenant);
        AssessmentConfig config = AssessmentValidator.normalize(draft.config());
        validator.validate(tenant, config, draft.sections(), false, Instant.now());
        return assessments.saveAndFlush(new Assessment(tenant, draft.title().trim(), blankToNull(draft.description()),
                config, draft.sections(), userId, null));
    }

    @Transactional(readOnly = true)
    public Page<Assessment> list(UUID tenant, AssessmentStatus status, int page, int size) {
        rls.asTenant(tenant);
        PageRequest request = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return status == null ? assessments.findByStatusNot(AssessmentStatus.ARCHIVED, request) : assessments.findByStatus(status, request);
    }

    @Transactional(readOnly = true)
    public Assessment get(UUID tenant, UUID id) {
        rls.asTenant(tenant);
        return find(id);
    }

    @Transactional
    public Assessment update(UUID tenant, UUID id, AssessmentDraft draft) {
        rls.asTenant(tenant);
        if (draft.expectedRevision() == null) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "expectedRevision is required");
        }
        Assessment a = findDraft(id, draft.expectedRevision());
        AssessmentConfig config = AssessmentValidator.normalize(draft.config());
        validator.validate(tenant, config, draft.sections(), false, Instant.now());
        a.updateDraft(draft.title().trim(), blankToNull(draft.description()), config, draft.sections());
        return saveOrConflict(a);
    }

    @Transactional
    public Assessment publish(UUID tenant, UUID userId, UUID id, int expectedRevision) {
        rls.asTenant(tenant);
        Assessment a = findDraft(id, expectedRevision);
        validator.validate(tenant, AssessmentValidator.normalize(a.getConfig()), a.getSections(), true, Instant.now());
        a.publish(userId);
        return saveOrConflict(a);
    }

    /** Copies any assessment into a new DRAFT (the way to "edit" a published one). */
    @Transactional
    public Assessment copy(UUID tenant, UUID userId, UUID id) {
        rls.asTenant(tenant);
        Assessment source = find(id);
        String title = source.getTitle().length() > 290 ? source.getTitle().substring(0, 290) : source.getTitle();
        return assessments.saveAndFlush(new Assessment(tenant, title + " (copy)", source.getDescription(),
                source.getConfig(), source.getSections(), userId, source.getId()));
    }

    @Transactional
    public void archive(UUID tenant, UUID id) {
        rls.asTenant(tenant);
        Assessment a = find(id);
        if (a.getStatus() != AssessmentStatus.ARCHIVED) {
            a.archive();
            saveOrConflict(a);
        }
    }

    private Assessment find(UUID id) {
        return assessments.findById(id).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Assessment not found"));
    }

    private Assessment findDraft(UUID id, int expectedRevision) {
        Assessment a = find(id);
        if (a.getStatus() != AssessmentStatus.DRAFT) {
            throw new ArqonException(ErrorCode.CONFLICT, "Only draft assessments can be changed. Copy it to make a new draft.");
        }
        if (a.getRevision() != expectedRevision) {
            throw new ArqonException(ErrorCode.CONFLICT, CONCURRENT);
        }
        return a;
    }

    private Assessment saveOrConflict(Assessment a) {
        try {
            return assessments.saveAndFlush(a);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new ArqonException(ErrorCode.CONFLICT, CONCURRENT);
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
