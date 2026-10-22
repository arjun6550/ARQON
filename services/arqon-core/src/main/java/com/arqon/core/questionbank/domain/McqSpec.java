package com.arqon.core.questionbank.domain;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record McqSpec(@NotNull @Size(min = 2, max = 8) List<@Valid McqOption> options, boolean multipleCorrect) {}
