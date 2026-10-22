package com.arqon.core.exam.service;

import com.arqon.core.exam.domain.Answer;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Plain SQL for the answers table (one row per question; upsert). RLS context must already be set by the caller. */
@Component
class AnswerStore {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    AnswerStore(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    void upsert(UUID tenantId, UUID sessionId, UUID questionId, Answer answer) {
        jdbc.update("insert into exam.exam_answers (session_id, question_id, tenant_id, answer) values (?::uuid, ?::uuid, ?::uuid, ?::jsonb) "
                        + "on conflict (session_id, question_id) do update set answer = excluded.answer, saved_at = now()",
                sessionId.toString(), questionId.toString(), tenantId.toString(), write(answer));
    }

    Map<UUID, Answer> load(UUID sessionId) {
        Map<UUID, Answer> out = new HashMap<>();
        jdbc.query("select question_id, answer::text as answer from exam.exam_answers where session_id = ?::uuid", rs -> {
            out.put(UUID.fromString(rs.getString("question_id")), read(rs.getString("answer")));
        }, sessionId.toString());
        return out;
    }

    private String write(Answer a) {
        try {
            return mapper.writeValueAsString(a);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private Answer read(String json) {
        try {
            return mapper.readValue(json, Answer.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}
