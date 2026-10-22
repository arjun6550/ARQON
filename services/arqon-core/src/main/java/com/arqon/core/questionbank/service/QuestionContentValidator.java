package com.arqon.core.questionbank.service;

import com.arqon.common.error.ApiError;
import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.core.questionbank.domain.CodingSpec;
import com.arqon.core.questionbank.domain.McqOption;
import com.arqon.core.questionbank.domain.McqSpec;
import com.arqon.core.questionbank.domain.QuestionType;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Cross-field rules that annotations cannot express. Throws VALIDATION_ERROR with per-field details. */
final class QuestionContentValidator {

    private QuestionContentValidator() {}

    static void validate(QuestionDraft d) {
        List<ApiError.Detail> errors = new ArrayList<>();
        if (d.type() == QuestionType.MCQ) {
            if (d.coding() != null) {
                errors.add(new ApiError.Detail("coding", "Must not be provided for MCQ questions"));
            }
            validateMcq(d.mcq(), errors);
        } else if (d.type() == QuestionType.CODING) {
            if (d.mcq() != null) {
                errors.add(new ApiError.Detail("mcq", "Must not be provided for coding questions"));
            }
            validateCoding(d.coding(), errors);
        }
        if (!errors.isEmpty()) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Question content is invalid", errors);
        }
    }

    private static void validateMcq(McqSpec mcq, List<ApiError.Detail> errors) {
        if (mcq == null || mcq.options() == null) {
            errors.add(new ApiError.Detail("mcq", "Required for MCQ questions"));
            return;
        }
        long correct = mcq.options().stream().filter(McqOption::correct).count();
        if (correct == 0) {
            errors.add(new ApiError.Detail("mcq.options", "At least one option must be marked correct"));
        } else if (!mcq.multipleCorrect() && correct != 1) {
            errors.add(new ApiError.Detail("mcq.options", "Exactly one option must be correct unless multipleCorrect is true"));
        }
        Set<String> texts = new HashSet<>();
        for (McqOption o : mcq.options()) {
            if (o.text() != null && !texts.add(o.text().trim().toLowerCase())) {
                errors.add(new ApiError.Detail("mcq.options", "Option texts must be unique"));
                break;
            }
        }
    }

    private static void validateCoding(CodingSpec coding, List<ApiError.Detail> errors) {
        if (coding == null) {
            errors.add(new ApiError.Detail("coding", "Required for coding questions"));
            return;
        }
        if (coding.languages() != null && new HashSet<>(coding.languages()).size() != coding.languages().size()) {
            errors.add(new ApiError.Detail("coding.languages", "Languages must be unique"));
        }
        if (coding.starterCode() != null && coding.languages() != null) {
            for (var language : coding.starterCode().keySet()) {
                if (!coding.languages().contains(language)) {
                    errors.add(new ApiError.Detail("coding.starterCode", "Starter code given for a language that is not enabled: " + language));
                }
            }
        }
    }
}
