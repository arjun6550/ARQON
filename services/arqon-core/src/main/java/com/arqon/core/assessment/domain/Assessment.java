package com.arqon.core.assessment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@DynamicUpdate
@Table(name = "assessments", schema = "assessment")
public class Assessment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssessmentStatus status = AssessmentStatus.DRAFT;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", nullable = false, columnDefinition = "jsonb")
    private AssessmentConfig config;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "sections", nullable = false, columnDefinition = "jsonb")
    private List<Section> sections;

    @Version
    @Column(name = "revision", nullable = false)
    private int revision;

    @Column(name = "source_assessment_id", updatable = false)
    private UUID sourceAssessmentId;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "published_by")
    private UUID publishedBy;

    protected Assessment() {}

    public Assessment(UUID tenantId, String title, String description, AssessmentConfig config, List<Section> sections,
                      UUID createdBy, UUID sourceAssessmentId) {
        this.tenantId = tenantId;
        this.title = title;
        this.description = description;
        this.config = config;
        this.sections = List.copyOf(sections);
        this.createdBy = createdBy;
        this.sourceAssessmentId = sourceAssessmentId;
    }

    public void updateDraft(String title, String description, AssessmentConfig config, List<Section> sections) {
        this.title = title;
        this.description = description;
        this.config = config;
        this.sections = List.copyOf(sections);
        this.updatedAt = Instant.now();
    }

    public void publish(UUID userId) {
        this.status = AssessmentStatus.PUBLISHED;
        this.publishedAt = Instant.now();
        this.publishedBy = userId;
        this.updatedAt = this.publishedAt;
    }

    public void archive() {
        this.status = AssessmentStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public AssessmentStatus getStatus() { return status; }
    public AssessmentConfig getConfig() { return config; }
    public List<Section> getSections() { return sections; }
    public int getRevision() { return revision; }
    public UUID getSourceAssessmentId() { return sourceAssessmentId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getPublishedAt() { return publishedAt; }
}
