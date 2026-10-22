package com.arqon.core.identity.service;

import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Writes to the service's audit trail inside the caller's transaction (RLS context must already be set). */
@Component
public class AuditWriter {

    private final JdbcTemplate jdbc;

    public AuditWriter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(UUID tenantId, UUID actorId, String action, String target, String ip) {
        jdbc.update("insert into identity.audit_events (tenant_id, actor_id, action, target, correlation_id, ip) "
                        + "values (?::uuid, ?::uuid, ?, ?, ?, ?)",
                tenantId == null ? null : tenantId.toString(),
                actorId == null ? null : actorId.toString(),
                action, target, MDC.get("correlationId"), ip);
    }
}
