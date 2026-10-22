package com.arqon.core.assessment.api;

import com.arqon.core.assessment.domain.Assessment;
import com.arqon.core.assessment.domain.AssessmentConfig;
import com.arqon.core.assessment.domain.AssessmentStatus;
import com.arqon.core.assessment.domain.ScheduleType;
import com.arqon.core.assessment.domain.Section;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Author-facing views (recruiters/admins). Candidate-facing views come with the exam session slice. */
public final class AssessmentViews {

    private AssessmentViews() {}

    public record Summary(UUID id, String title, AssessmentStatus status, ScheduleType scheduleType, Instant windowStart,
                          Instant windowEnd, int durationMinutes, int sectionCount, int questionCount, int revision, Instant updatedAt) {
        static Summary from(Assessment a) {
            var s = a.getConfig().schedule();
            int questions = a.getSections().stream().mapToInt(sec -> sec.items().size()).sum();
            return new Summary(a.getId(), a.getTitle(), a.getStatus(), s.type(), s.windowStart(), s.windowEnd(),
                    s.durationMinutes(), a.getSections().size(), questions, a.getRevision(), a.getUpdatedAt());
        }
    }

    public record Detail(UUID id, String title, String description, AssessmentStatus status, int revision, AssessmentConfig config,
                         List<Section> sections, UUID sourceAssessmentId, Instant createdAt, Instant updatedAt, Instant publishedAt) {
        static Detail from(Assessment a) {
            return new Detail(a.getId(), a.getTitle(), a.getDescription(), a.getStatus(), a.getRevision(), a.getConfig(),
                    a.getSections(), a.getSourceAssessmentId(), a.getCreatedAt(), a.getUpdatedAt(), a.getPublishedAt());
        }
    }
}
