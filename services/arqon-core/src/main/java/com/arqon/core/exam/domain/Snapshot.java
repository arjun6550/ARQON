package com.arqon.core.exam.domain;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Everything the session needs, frozen at start (stored as JSONB). Contains correct answers: it must never be returned
 * to a candidate as-is (see ExamViews.CandidateExam).
 */
public record Snapshot(String title, int durationMinutes, int mcqWeight, int codingWeight, int passPercentage,
                       List<String> allowedLanguages, List<Sec> sections) {

    public record Sec(String title, boolean coding, List<Item> items) {}

    public record Item(UUID questionId, int version, int points, boolean coding, String title, String body,
                       List<Opt> options, boolean multipleCorrect, List<String> languages, Map<String, String> starterCode,
                       List<Sample> samples, int hiddenTestCount) {}

    public record Opt(String text, boolean correct) {}

    public record Sample(String input, String expectedOutput) {}
}
