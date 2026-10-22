package com.arqon.common.tenant;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.MDC;

/**
 * Holder for the current request's tenant.
 * SECURITY RULE: the value must only be set from a VERIFIED token/invitation (wired in Slice 1.1),
 * never from request parameters, bodies or client-supplied headers.
 * Callers that set it must clear it in a finally block.
 */
public final class TenantContext {

    public static final String MDC_KEY = "tenantId";
    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID tenantId) {
        Objects.requireNonNull(tenantId, "tenantId");
        CURRENT.set(tenantId);
        MDC.put(MDC_KEY, tenantId.toString());
    }

    public static Optional<UUID> get() {
        return Optional.ofNullable(CURRENT.get());
    }

    public static UUID require() {
        return get().orElseThrow(() -> new ArqonException(ErrorCode.FORBIDDEN, "Tenant context is required"));
    }

    public static void clear() {
        CURRENT.remove();
        MDC.remove(MDC_KEY);
    }
}
