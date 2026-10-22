package com.arqon.core.assessment.domain;

import com.arqon.common.domain.Language;
import com.arqon.core.assessment.domain.Policies.IdentityPolicy;
import com.arqon.core.assessment.domain.Policies.IntegrityPolicy;
import com.arqon.core.assessment.domain.Policies.RecoveryPolicy;
import com.arqon.core.assessment.domain.Policies.ResultVisibility;
import com.arqon.core.assessment.domain.Policies.ScoringPolicy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record AssessmentConfig(
        @NotNull @Valid Schedule schedule,
        @NotNull Set<Language> allowedLanguages,
        @NotNull @Valid IntegrityPolicy integrity,
        @NotNull @Valid ScoringPolicy scoring,
        @NotNull @Valid ResultVisibility visibility,
        @NotNull @Valid RecoveryPolicy recovery,
        @NotNull @Valid IdentityPolicy identity,
        boolean singleSession) {

    public AssessmentConfig withSchedule(Schedule newSchedule) {
        return new AssessmentConfig(newSchedule, allowedLanguages, integrity, scoring, visibility, recovery, identity, singleSession);
    }
}
