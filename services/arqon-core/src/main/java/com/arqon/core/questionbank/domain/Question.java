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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Logical question: identity, tags, status and the pointer to the current version. Content lives in QuestionVersion. */
@Entity
@Table(name = "questions", schema = "qbank")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, updatable = false)
    private QuestionType type;

    @Column(name = "title", nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false)
    private Difficulty difficulty;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", nullable = false, columnDefinition = "jsonb")
    private List<String> tags = new ArrayList<>();

    @Column(name = "current_version", nullable = false)
    private int currentVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private QuestionStatus status = QuestionStatus.ACTIVE;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Question() {}

    public Question(UUID tenantId, QuestionType type, String title, Difficulty difficulty, List<String> tags, UUID createdBy) {
        this.tenantId = tenantId;
        this.type = type;
        this.title = title;
        this.difficulty = difficulty;
        this.tags = new ArrayList<>(tags);
        this.createdBy = createdBy;
    }

    public void applyNewVersion(int version, String title, Difficulty difficulty, List<String> tags) {
        this.currentVersion = version;
        this.title = title;
        this.difficulty = difficulty;
        this.tags = new ArrayList<>(tags);
        this.updatedAt = Instant.now();
    }

    public void archive() {
        this.status = QuestionStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public QuestionType getType() { return type; }
    public String getTitle() { return title; }
    public Difficulty getDifficulty() { return difficulty; }
    public List<String> getTags() { return tags; }
    public int getCurrentVersion() { return currentVersion; }
    public QuestionStatus getStatus() { return status; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getUpdatedAt() { return updatedAt; }
}
