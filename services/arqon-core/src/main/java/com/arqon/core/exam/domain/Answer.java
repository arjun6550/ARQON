package com.arqon.core.exam.domain;

import java.util.List;

/** MCQ: selected = option indexes. CODING: language + source text (stored only; NEVER executed by this service). */
public record Answer(List<Integer> selected, String language, String code) {}
