package com.arqon.common.api;

import java.util.List;

/** Uniform pagination envelope for list endpoints. */
public record PageResponse<T>(List<T> items, int page, int size, long totalElements) {}
