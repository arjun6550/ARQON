package com.arqon.core.invitation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Audit trail + transactional outbox rows, written inside the caller's transaction. Never receives raw tokens. */
@Component
class InvitationAudit {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    InvitationAudit(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    void record(UUID tenantId, UUID actorId, String action, UUID invitationId, String ip) {
        jdbc.update("insert into invitation.audit_events (tenant_id, actor_id, action, target, correlation_id, ip) values (?::uuid, ?::uuid, ?, ?, ?, ?)",
                tenantId.toString(), actorId == null ? null : actorId.toString(), action, invitationId.toString(), MDC.get("correlationId"), ip);
    }

    void outbox(UUID tenantId, UUID invitationId, String eventType, Map<String, Object> payload) {
        String json;
        try {
            json = mapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        jdbc.update("insert into invitation.outbox_events (id, tenant_id, aggregate_type, aggregate_id, event_type, correlation_id, payload) "
                        + "values (?::uuid, ?::uuid, 'Invitation', ?::uuid, ?, ?, ?::jsonb)",
                UUID.randomUUID().toString(), tenantId.toString(), invitationId.toString(), eventType, MDC.get("correlationId"), json);
    }
}
