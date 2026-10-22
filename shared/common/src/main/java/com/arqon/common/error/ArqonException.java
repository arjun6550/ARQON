package com.arqon.common.error;

import java.util.List;

/** Base type for expected, client-visible failures. The message MUST be safe to show to end users. */
public class ArqonException extends RuntimeException {

    private final ErrorCode code;
    private final transient List<ApiError.Detail> details;

    public ArqonException(ErrorCode code, String message) {
        this(code, message, List.of());
    }

    public ArqonException(ErrorCode code, String message, List<ApiError.Detail> details) {
        super(message);
        this.code = code;
        this.details = details == null ? List.of() : List.copyOf(details);
    }

    public ErrorCode getCode() {
        return code;
    }

    public List<ApiError.Detail> getDetails() {
        return details;
    }
}
