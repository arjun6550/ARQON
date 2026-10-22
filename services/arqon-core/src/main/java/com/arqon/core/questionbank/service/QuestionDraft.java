package com.arqon.core.questionbank.service;

import com.arqon.core.questionbank.domain.CodingSpec;
import com.arqon.core.questionbank.domain.Difficulty;
import com.arqon.core.questionbank.domain.McqSpec;
import com.arqon.core.questionbank.domain.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Input for creating a question or a new version of it. expectedVersion is required when updating. */
public record QuestionDraft(
        @NotNull QuestionType type,
        @NotBlank @Size(max = 300) String title,
        @NotBlank @Size(max = 20000) String body,
        @NotNull Difficulty difficulty,
        @Size(max = 10) List<@NotBlank @Size(max = 40) String> tags,
        @Valid McqSpec mcq,
        @Valid CodingSpec coding,
        Integer expectedVersion) {}
