package com.arqon.common.error;

import java.time.Instant;
import java.util.List;
import org.slf4j.MDC;

/** Uniform error body (spec section 58). Never contains stack traces, SQL or infrastructure details. */
public record ApiError(Instant timestamp, int status, String code, String message, String traceId, List<Detail> details) {

    public record Detail(String field, String message) {}

    public static ApiError of(int status, String code, String message, List<Detail> details) {
        return new ApiError(Instant.now(), status, code, message, currentTraceId(), details == null ? List.of() : List.copyOf(details));
    }

    public static ApiError of(ErrorCode code, String message, List<Detail> details) {
        return of(code.getStatus().value(), code.name(), message, details);
    }

    /** Prefers the distributed trace id; falls back to the correlation id. */
    private static String currentTraceId() {
        String id = MDC.get("traceId");
        if (id == null || id.isBlank()) {
            id = MDC.get("correlationId");
        }
        return (id == null || id.isBlank()) ? "unavailable" : id;
    }
}
