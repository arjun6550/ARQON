package com.arqon.core.assessment.service;

import com.arqon.core.assessment.domain.AssessmentConfig;
import com.arqon.core.assessment.domain.Section;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Input for creating or updating a DRAFT. expectedRevision is required when updating (optimistic concurrency). */
public record AssessmentDraft(
        @NotBlank @Size(max = 300) String title,
        @Size(max = 5000) String description,
        @NotNull @Valid AssessmentConfig config,
        @NotNull @Size(max = 10) List<@Valid Section> sections,
        Integer expectedRevision) {}
