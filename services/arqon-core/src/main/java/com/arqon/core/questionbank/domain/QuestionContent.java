package com.arqon.core.questionbank.domain;

/** Type-specific content stored as JSONB inside an immutable version. Exactly one of the fields is set. */
public record QuestionContent(McqSpec mcq, CodingSpec coding) {}
