package com.arqon.core.invitation.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.arqon.core.invitation.domain.Invitation.Effective;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class InvitationTest {

    private static final Instant NOW = Instant.parse("2030-01-01T00:00:00Z");

    private Invitation invitation(Instant expires) {
        return new Invitation(UUID.randomUUID(), UUID.randomUUID(), "a@b.io", "hash1", expires, UUID.randomUUID());
    }

    @Test
    void lifecyclePendingOpenedExpiredRevoked() {
        Invitation i = invitation(NOW.plusSeconds(60));
        assertThat(i.effectiveStatus(NOW)).isEqualTo(Effective.PENDING);
        assertThat(i.markOpened(NOW)).isTrue();
        assertThat(i.markOpened(NOW)).as("only the first open counts").isFalse();
        assertThat(i.effectiveStatus(NOW)).isEqualTo(Effective.OPENED);
        assertThat(i.effectiveStatus(NOW.plusSeconds(60))).isEqualTo(Effective.EXPIRED);
        assertThat(i.isUsable(NOW.plusSeconds(61))).isFalse();
        i.revoke(NOW);
        assertThat(i.effectiveStatus(NOW)).isEqualTo(Effective.REVOKED);
        assertThat(i.isUsable(NOW)).isFalse();
    }

    @Test
    void rotatingTheTokenResetsOpenedStateAndDelivery() {
        Invitation i = invitation(NOW.plusSeconds(60));
        i.markOpened(NOW);
        i.markSent(NOW);
        i.rotateToken("hash2", NOW.plusSeconds(600));
        assertThat(i.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(i.getEmailStatus()).isEqualTo(EmailStatus.PENDING);
        assertThat(i.getOpenedAt()).isNull();
        assertThat(i.getExpiresAt()).isEqualTo(NOW.plusSeconds(600));
        assertThat(i.getSendCount()).isEqualTo(1);
    }
}
