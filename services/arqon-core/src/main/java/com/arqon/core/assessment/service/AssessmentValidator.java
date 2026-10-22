package com.arqon.core.assessment.service;

import com.arqon.common.error.ApiError;
import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.core.assessment.domain.AssessmentConfig;
import com.arqon.core.assessment.domain.Schedule;
import com.arqon.core.assessment.domain.ScheduleType;
import com.arqon.core.assessment.domain.Section;
import com.arqon.core.assessment.domain.SectionType;
import com.arqon.core.questionbank.QuestionBankApi;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Cross-field and cross-module rules that annotations cannot express. */
final class AssessmentValidator {

    private static final int MAX_MINUTES = 180;
    private static final int MIN_MINUTES = 5;

    private final QuestionBankApi questionBank;

    AssessmentValidator(QuestionBankApi questionBank) {
        this.questionBank = questionBank;
    }

    /** A fixed window defines the duration: the exam lasts exactly as long as the window. */
    static AssessmentConfig normalize(AssessmentConfig config) {
        Schedule s = config.schedule();
        if (s.type() == ScheduleType.FIXED_WINDOW && s.windowEnd().isAfter(s.windowStart())) {
            long minutes = Duration.between(s.windowStart(), s.windowEnd()).toMinutes();
            if (minutes >= MIN_MINUTES && minutes <= MAX_MINUTES && minutes != s.durationMinutes()) {
                return config.withSchedule(new Schedule(s.type(), s.windowStart(), s.windowEnd(), (int) minutes));
            }
        }
        return config;
    }

    void validate(UUID tenant, AssessmentConfig config, List<Section> sections, boolean forPublish, Instant now) {
        List<ApiError.Detail> errors = new ArrayList<>();
        validateSchedule(config.schedule(), forPublish, now, errors);
        validateSections(tenant, config, sections, errors);
        if (forPublish) {
            validateForPublish(config, sections, errors);
        }
        if (!errors.isEmpty()) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Assessment is invalid", errors);
        }
    }

    private void validateSchedule(Schedule s, boolean forPublish, Instant now, List<ApiError.Detail> errors) {
        if (!s.windowEnd().isAfter(s.windowStart())) {
            errors.add(new ApiError.Detail("config.schedule.windowEnd", "Must be after windowStart"));
            return;
        }
        long windowMinutes = Duration.between(s.windowStart(), s.windowEnd()).toMinutes();
        if (s.type() == ScheduleType.FIXED_WINDOW && (windowMinutes < MIN_MINUTES || windowMinutes > MAX_MINUTES)) {
            errors.add(new ApiError.Detail("config.schedule", "A fixed window must last between 5 and 180 minutes"));
        }
        if (s.type() == ScheduleType.FLEXIBLE_WINDOW && windowMinutes < s.durationMinutes()) {
            errors.add(new ApiError.Detail("config.schedule", "The start window must be at least as long as the exam duration"));
        }
        if (forPublish && !s.windowEnd().isAfter(now)) {
            errors.add(new ApiError.Detail("config.schedule.windowEnd", "Must be in the future to publish"));
        }
    }

    private void validateSections(UUID tenant, AssessmentConfig config, List<Section> sections, List<ApiError.Detail> errors) {
        Set<UUID> seen = new HashSet<>();
        boolean hasCoding = false;
        for (int i = 0; i < sections.size(); i++) {
            Section section = sections.get(i);
            hasCoding |= section.type() == SectionType.CODING;
            for (int j = 0; j < section.items().size(); j++) {
                var item = section.items().get(j);
                String field = "sections[" + i + "].items[" + j + "]";
                if (!seen.add(item.questionId())) {
                    errors.add(new ApiError.Detail(field, "The same question is used more than once"));
                    continue;
                }
                var pinned = questionBank.findPinnable(tenant, item.questionId(), item.version());
                if (pinned.isEmpty()) {
                    errors.add(new ApiError.Detail(field, "Question version not found or archived"));
                    continue;
                }
                var q = pinned.get();
                if (!q.kind().name().equals(section.type().name())) {
                    errors.add(new ApiError.Detail(field, "A " + q.kind() + " question cannot be placed in a " + section.type() + " section"));
                } else if (q.kind() == QuestionBankApi.Kind.CODING && Collections.disjoint(config.allowedLanguages(), q.languages())) {
                    errors.add(new ApiError.Detail(field, "None of the enabled languages is supported by this question"));
                }
            }
        }
        if (hasCoding && config.allowedLanguages().isEmpty()) {
            errors.add(new ApiError.Detail("config.allowedLanguages", "Enable at least one language for coding sections"));
        }
    }

    private void validateForPublish(AssessmentConfig config, List<Section> sections, List<ApiError.Detail> errors) {
        if (sections.isEmpty()) {
            errors.add(new ApiError.Detail("sections", "Add at least one section"));
            return;
        }
        Set<SectionType> present = EnumSet.noneOf(SectionType.class);
        for (int i = 0; i < sections.size(); i++) {
            present.add(sections.get(i).type());
            if (sections.get(i).items().isEmpty()) {
                errors.add(new ApiError.Detail("sections[" + i + "].items", "A section needs at least one question"));
            }
        }
        var weights = config.scoring().weights();
        int sum = weights.values().stream().mapToInt(w -> w == null ? 0 : w).sum();
        boolean allPositive = weights.values().stream().allMatch(w -> w != null && w > 0);
        if (!weights.keySet().equals(present) || sum != 100 || !allPositive) {
            errors.add(new ApiError.Detail("config.scoring.weights",
                    "Weights must be defined exactly for the section types present (" + present + "), each above 0, and add up to 100"));
        }
    }
}
