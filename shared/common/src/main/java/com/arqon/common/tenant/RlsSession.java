package com.arqon.common.tenant;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sets the PostgreSQL session variables that Row-Level Security policies read.
 * Values are transaction-scoped (set_config(..., true)), so they can never leak to another request that
 * reuses the pooled connection. Must be called inside an active transaction. If nothing is set, the
 * policies match no rows (fail closed).
 *
 *  - asTenant(id): normal tenant-scoped access; tenant comes from the VERIFIED token (TenantContext).
 *  - asSystem():   platform-level access (login lookups, super-admin operations). Use sparingly and audit.
 */
public class RlsSession {

    private final JdbcTemplate jdbc;

    public RlsSession(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void asTenant(UUID tenantId) {
        requireTransaction();
        jdbc.queryForObject("select set_config('app.tenant_id', ?, true)", String.class, tenantId.toString());
    }

    public void asSystem() {
        requireTransaction();
        jdbc.queryForObject("select set_config('app.system', 'on', true)", String.class);
    }

    private static void requireTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("RLS context must be set inside a transaction");
        }
    }
}
