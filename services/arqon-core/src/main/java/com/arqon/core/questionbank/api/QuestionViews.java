package com.arqon.core.questionbank.api;

import com.arqon.core.questionbank.domain.CodingSpec;
import com.arqon.core.questionbank.domain.Difficulty;
import com.arqon.core.questionbank.domain.McqSpec;
import com.arqon.core.questionbank.domain.Question;
import com.arqon.core.questionbank.domain.QuestionType;
import com.arqon.core.questionbank.domain.QuestionVersion;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * AUTHOR-facing views (recruiters/admins): they include correct answers and hidden test cases.
 * Candidate-facing views (no correct flags, no hidden tests) are added with the exam session slice and must be separate types.
 */
public final class QuestionViews {

    private QuestionViews() {}

    public record Summary(UUID id, QuestionType type, String title, Difficulty difficulty, List<String> tags, int currentVersion, Instant updatedAt) {
        static Summary from(Question q) {
            return new Summary(q.getId(), q.getType(), q.getTitle(), q.getDifficulty(), q.getTags(), q.getCurrentVersion(), q.getUpdatedAt());
        }
    }

    public record Detail(UUID id, QuestionType type, String status, int currentVersion, int version, String title, String body,
                         Difficulty difficulty, List<String> tags, McqSpec mcq, CodingSpec coding, Instant versionCreatedAt, UUID versionCreatedBy) {
        static Detail from(Question q, QuestionVersion v) {
            return new Detail(q.getId(), q.getType(), q.getStatus().name(), q.getCurrentVersion(), v.getVersion(), v.getTitle(), v.getBody(),
                    v.getDifficulty(), q.getTags(), v.getContent().mcq(), v.getContent().coding(), v.getCreatedAt(), v.getCreatedBy());
        }
    }

    public record VersionSummary(int version, String title, Instant createdAt, UUID createdBy) {
        static VersionSummary from(QuestionVersion v) {
            return new VersionSummary(v.getVersion(), v.getTitle(), v.getCreatedAt(), v.getCreatedBy());
        }
    }
}
