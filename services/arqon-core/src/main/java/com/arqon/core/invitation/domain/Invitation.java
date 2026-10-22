package com.arqon.core.invitation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitations", schema = "invitation")
public class Invitation {

    /** Derived view for API clients. */
    public enum Effective { PENDING, OPENED, EXPIRED, REVOKED }

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "assessment_id", nullable = false, updatable = false)
    private UUID assessmentId;

    @Column(name = "candidate_email", nullable = false, updatable = false)
    private String candidateEmail;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_status", nullable = false)
    private EmailStatus emailStatus = EmailStatus.PENDING;

    @Column(name = "send_count", nullable = false)
    private int sendCount;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "opened_at")
    private Instant openedAt;

    @Column(name = "last_sent_at")
    private Instant lastSentAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected Invitation() {}

    public Invitation(UUID tenantId, UUID assessmentId, String candidateEmail, String tokenHash, Instant expiresAt, UUID createdBy) {
        this.id = UUID.randomUUID();
        this.tenantId = tenantId;
        this.assessmentId = assessmentId;
        this.candidateEmail = candidateEmail;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdBy = createdBy;
    }

    public Effective effectiveStatus(Instant now) {
        if (status == InvitationStatus.REVOKED) return Effective.REVOKED;
        if (!expiresAt.isAfter(now)) return Effective.EXPIRED;
        return status == InvitationStatus.OPENED ? Effective.OPENED : Effective.PENDING;
    }

    public boolean isUsable(Instant now) {
        Effective e = effectiveStatus(now);
        return e == Effective.PENDING || e == Effective.OPENED;
    }

    /** A new link invalidates the old one. Resets delivery state; optionally moves the expiry. */
    public void rotateToken(String newTokenHash, Instant newExpiresAt) {
        this.tokenHash = newTokenHash;
        this.expiresAt = newExpiresAt;
        this.status = InvitationStatus.PENDING;
        this.openedAt = null;
        this.emailStatus = EmailStatus.PENDING;
    }

    /** @return true when this call changed the state (first open). */
    public boolean markOpened(Instant now) {
        if (status != InvitationStatus.PENDING) return false;
        status = InvitationStatus.OPENED;
        openedAt = now;
        return true;
    }

    public void markSent(Instant now) {
        emailStatus = EmailStatus.SENT;
        sendCount++;
        lastSentAt = now;
    }

    public void markSendFailed() {
        emailStatus = EmailStatus.FAILED;
    }

    public void revoke(Instant now) {
        status = InvitationStatus.REVOKED;
        revokedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getAssessmentId() { return assessmentId; }
    public String getCandidateEmail() { return candidateEmail; }
    public InvitationStatus getStatus() { return status; }
    public EmailStatus getEmailStatus() { return emailStatus; }
    public int getSendCount() { return sendCount; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getOpenedAt() { return openedAt; }
    public Instant getLastSentAt() { return lastSentAt; }
}
