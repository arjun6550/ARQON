package com.arqon.core.assessment.domain;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/**
 * FIXED_WINDOW: everyone starts at windowStart and the exam ends at windowEnd (duration = window length, max 3 h).
 * FLEXIBLE_WINDOW: a candidate may START any time inside [windowStart, windowEnd] and then gets durationMinutes (max 3 h).
 * The server is authoritative for the timer; these are only the rules it applies.
 */
public record Schedule(
        @NotNull ScheduleType type,
        @NotNull Instant windowStart,
        @NotNull Instant windowEnd,
        @Min(5) @Max(180) int durationMinutes) {}
