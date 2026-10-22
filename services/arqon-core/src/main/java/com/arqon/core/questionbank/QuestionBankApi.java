package com.arqon.core.questionbank;

import com.arqon.common.domain.Language;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Published API of the question bank module (the only thing other modules may use).
 * Used by assessments to PIN a question version: only ACTIVE questions of the given tenant can be pinned.
 */
public interface QuestionBankApi {

    enum Kind { MCQ, CODING }

    record PinnableQuestion(UUID questionId, int version, Kind kind, String title, Set<Language> languages) {}

    Optional<PinnableQuestion> findPinnable(UUID tenantId, UUID questionId, int version);

    record Option(String text, boolean correct) {}

    record Sample(String input, String expectedOutput) {}

    /** Full content of one pinned version, for building an exam. Contains answers: callers must strip them for candidates. */
    record QuestionSnapshot(UUID questionId, int version, Kind kind, String title, String body, List<Option> options,
                            boolean multipleCorrect, List<Language> languages, Map<Language, String> starterCode,
                            List<Sample> visibleSamples, int hiddenTestCount) {}

    /** Any status (an archived question that is pinned by a published assessment must still be servable). */
    Optional<QuestionSnapshot> snapshot(UUID tenantId, UUID questionId, int version);
}
