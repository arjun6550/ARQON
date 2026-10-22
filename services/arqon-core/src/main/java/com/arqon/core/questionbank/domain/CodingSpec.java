package com.arqon.core.questionbank.domain;

import com.arqon.common.domain.Language;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

public record CodingSpec(
        @NotEmpty @Size(max = 10) List<Language> languages,
        Map<Language, @Size(max = 20000) String> starterCode,
        @Min(100) @Max(30000) int timeLimitMs,
        @Min(16) @Max(1024) int memoryLimitMb,
        @NotEmpty @Size(max = 50) List<@Valid TestCase> testCases) {}
