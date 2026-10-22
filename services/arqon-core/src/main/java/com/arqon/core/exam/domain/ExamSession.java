package com.arqon.core.exam.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@DynamicUpdate
@Table(name = "exam_sessions", schema = "exam")
public class ExamSession {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "invitation_id", nullable = false, updatable = false)
    private UUID invitationId;

    @Column(name = "assessment_id", nullable = false, updatable = false)
    private UUID assessmentId;

    @Column(name = "candidate_email", nullable = false, updatable = false)
    private String candidateEmail;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExamStatus status = ExamStatus.IN_PROGRESS;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "deadline_at", nullable = false, updatable = false)
    private Instant deadlineAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot", nullable = false, updatable = false, columnDefinition = "jsonb")
    private Snapshot snapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result", columnDefinition = "jsonb")
    private ExamResult result;

    protected ExamSession() {}

    public ExamSession(UUID tenantId, UUID invitationId, UUID assessmentId, String candidateEmail, String tokenHash,
                       Instant startedAt, Instant deadlineAt, Snapshot snapshot) {
        this.id = UUID.randomUUID();
        this.tenantId = tenantId;
        this.invitationId = invitationId;
        this.assessmentId = assessmentId;
        this.candidateEmail = candidateEmail;
        this.tokenHash = tokenHash;
        this.startedAt = startedAt;
        this.deadlineAt = deadlineAt;
        this.snapshot = snapshot;
    }

    public boolean isOpen() { return status == ExamStatus.IN_PROGRESS; }

    public void rotateToken(String newHash) { this.tokenHash = newHash; }

    public void finish(ExamStatus how, Instant now, ExamResult computed) {
        this.status = how;
        this.submittedAt = now;
        this.result = computed;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getInvitationId() { return invitationId; }
    public UUID getAssessmentId() { return assessmentId; }
    public String getCandidateEmail() { return candidateEmail; }
    public ExamStatus getStatus() { return status; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getDeadlineAt() { return deadlineAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Snapshot getSnapshot() { return snapshot; }
    public ExamResult getResult() { return result; }
}
