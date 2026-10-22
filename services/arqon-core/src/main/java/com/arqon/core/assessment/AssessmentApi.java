package com.arqon.core.assessment;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Published API of the assessment module (the only thing other modules may use).
 * Used by invitations to learn what a candidate is being invited to, without touching assessment internals.
 */
public interface AssessmentApi {

    record AssessmentInfo(UUID id, String title, boolean published, boolean fixedWindow, Instant windowStart, Instant windowEnd,
                          int durationMinutes, boolean cameraRequired, boolean microphoneRequired, boolean emailVerification,
                          boolean otp, boolean idUpload, boolean selfie) {}

    /** The assessment of the given tenant, or empty when it does not exist or belongs to another tenant. */
    Optional<AssessmentInfo> find(UUID tenantId, UUID assessmentId);

    record BlueprintItem(UUID questionId, int version, int points) {}

    record BlueprintSection(String title, boolean coding, List<BlueprintItem> items) {}

    /** What an exam session needs: sections with pinned items, scoring weights and allowed languages. */
    record Blueprint(AssessmentInfo info, int mcqWeight, int codingWeight, int passPercentage, List<String> allowedLanguages,
                     List<BlueprintSection> sections) {}

    Optional<Blueprint> blueprint(UUID tenantId, UUID assessmentId);
}
