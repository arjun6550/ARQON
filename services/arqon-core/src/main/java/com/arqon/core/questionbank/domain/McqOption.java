package com.arqon.core.questionbank.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record McqOption(@NotBlank @Size(max = 1000) String text, boolean correct) {}
