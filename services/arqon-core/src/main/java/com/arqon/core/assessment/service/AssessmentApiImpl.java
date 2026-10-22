package com.arqon.core.assessment.service;

import com.arqon.common.tenant.RlsSession;
import com.arqon.core.assessment.AssessmentApi;
import com.arqon.core.assessment.domain.AssessmentRepository;
import com.arqon.core.assessment.domain.AssessmentStatus;
import com.arqon.core.assessment.domain.ScheduleType;
import com.arqon.core.assessment.domain.SectionType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AssessmentApiImpl implements AssessmentApi {

    private final AssessmentRepository assessments;
    private final RlsSession rls;

    AssessmentApiImpl(AssessmentRepository assessments, RlsSession rls) {
        this.assessments = assessments;
        this.rls = rls;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AssessmentInfo> find(UUID tenantId, UUID assessmentId) {
        rls.asTenant(tenantId);
        return assessments.findById(assessmentId).map(a -> {
            var c = a.getConfig();
            var s = c.schedule();
            return new AssessmentInfo(a.getId(), a.getTitle(), a.getStatus() == AssessmentStatus.PUBLISHED,
                    s.type() == ScheduleType.FIXED_WINDOW, s.windowStart(), s.windowEnd(), s.durationMinutes(),
                    c.integrity().cameraRequired(), c.integrity().microphoneRequired(),
                    c.identity().emailVerification(), c.identity().otp(), c.identity().idUpload(), c.identity().selfie());
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Blueprint> blueprint(UUID tenantId, UUID assessmentId) {
        return find(tenantId, assessmentId).flatMap(info -> assessments.findById(assessmentId).map(a -> {
            var weights = a.getConfig().scoring().weights();
            List<BlueprintSection> sections = a.getSections().stream().map(sec -> new BlueprintSection(sec.title(),
                    sec.type() == SectionType.CODING,
                    sec.items().stream().map(i -> new BlueprintItem(i.questionId(), i.version(), i.points())).toList())).toList();
            return new Blueprint(info, weights.getOrDefault(SectionType.MCQ, 0), weights.getOrDefault(SectionType.CODING, 0),
                    a.getConfig().scoring().passPercentage(),
                    a.getConfig().allowedLanguages().stream().map(Enum::name).toList(), sections);
        }));
    }
}
