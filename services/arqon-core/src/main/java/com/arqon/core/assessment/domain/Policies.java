package com.arqon.core.assessment.domain;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

/** Policy records stored inside the assessment config (validated JSONB). */
public final class Policies {

    private Policies() {}

    public record IntegrityPolicy(boolean fullscreenRequired, boolean cameraRequired, boolean microphoneRequired,
                                  boolean blockCopyPaste, @NotNull TabSwitchAction tabSwitchAction,
                                  @Min(0) @Max(10) int maxWarnings) {}

    public record ScoringPolicy(@NotNull Map<SectionType, @Min(0) @Max(100) Integer> weights, @Min(0) @Max(100) int passPercentage) {}

    /** Hidden test details and correct answers are NEVER shown unless explicitly enabled here. */
    public record ResultVisibility(boolean mcqImmediate, boolean codingAfterSubmit, boolean showHiddenTestDetails, boolean showCorrectAnswers) {}

    public record RecoveryPolicy(boolean allowRecovery, @Min(0) @Max(3600) int graceSeconds, @Min(0) @Max(10) int maxRecoveries) {}

    public record IdentityPolicy(boolean emailVerification, boolean otp, boolean idUpload, boolean selfie) {}
}
