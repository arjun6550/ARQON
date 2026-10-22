package com.arqon.core.assessment.domain;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** A section groups questions of ONE type. Items pin an exact question version. */
public record Section(
        @NotBlank @Size(max = 200) String title,
        @NotNull SectionType type,
        @NotNull @Size(max = 100) List<@Valid Item> items) {

    public record Item(@NotNull UUID questionId, @Min(1) int version, @Min(1) @Max(1000) int points) {}
}
