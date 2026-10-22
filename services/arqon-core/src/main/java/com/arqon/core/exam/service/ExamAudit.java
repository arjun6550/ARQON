package com.arqon.core.exam.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class ExamAudit {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    ExamAudit(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    void record(UUID tenantId, String action, UUID sessionId, String ip) {
        jdbc.update("insert into exam.audit_events (tenant_id, action, target, correlation_id, ip) values (?::uuid, ?, ?, ?, ?)",
                tenantId.toString(), action, sessionId.toString(), MDC.get("correlationId"), ip);
    }

    void outbox(UUID tenantId, UUID sessionId, String eventType, Map<String, Object> payload) {
        String json;
        try {
            json = mapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        jdbc.update("insert into exam.outbox_events (id, tenant_id, aggregate_type, aggregate_id, event_type, correlation_id, payload) "
                        + "values (?::uuid, ?::uuid, 'ExamSession', ?::uuid, ?, ?, ?::jsonb)",
                UUID.randomUUID().toString(), tenantId.toString(), sessionId.toString(), eventType, MDC.get("correlationId"), json);
    }
}
