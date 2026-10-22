package com.arqon.core.questionbank.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Immutable snapshot (no setters; a DB trigger also rejects UPDATE/DELETE). */
@Entity
@Table(name = "question_versions", schema = "qbank")
public class QuestionVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "question_id", nullable = false, updatable = false)
    private UUID questionId;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "version", nullable = false, updatable = false)
    private int version;

    @Column(name = "title", nullable = false, updatable = false)
    private String title;

    @Column(name = "body", nullable = false, updatable = false, columnDefinition = "text")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false, updatable = false)
    private Difficulty difficulty;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", nullable = false, updatable = false, columnDefinition = "jsonb")
    private QuestionContent content;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected QuestionVersion() {}

    public QuestionVersion(UUID questionId, UUID tenantId, int version, String title, String body,
                           Difficulty difficulty, QuestionContent content, UUID createdBy) {
        this.questionId = questionId;
        this.tenantId = tenantId;
        this.version = version;
        this.title = title;
        this.body = body;
        this.difficulty = difficulty;
        this.content = content;
        this.createdBy = createdBy;
    }

    public UUID getQuestionId() { return questionId; }
    public int getVersion() { return version; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public Difficulty getDifficulty() { return difficulty; }
    public QuestionContent getContent() { return content; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
