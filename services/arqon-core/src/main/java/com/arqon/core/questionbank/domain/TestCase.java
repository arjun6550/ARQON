package com.arqon.core.questionbank.domain;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** hidden=true cases are never shown to candidates; only the author-facing views include their data. */
public record TestCase(
        @NotNull @Size(max = 10000) String input,
        @NotNull @Size(max = 10000) String expectedOutput,
        boolean hidden,
        @Min(1) @Max(100) int weight) {}
