package com.arqon.core.exam.domain;

/**
 * MCQ is auto-graded. Coding is NOT evaluated yet (PLACEHOLDER / NOT PRODUCTION READY: secure execution is Phase 2),
 * so the total is only provisional and "passed" is unknown.
 */
public record ExamResult(int mcqScore, int mcqMax, double mcqPercent, int codingMax, int codingSubmitted, int codingQuestions,
                         String codingStatus, double provisionalPercent, Boolean passed) {}
