package com.arqon.core.invitation.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class InvitationRulesTest {

    @Test
    void validatesAndNormalizesEmails() {
        assertThat(InvitationService.normalize("  Ann@Example.COM ")).isEqualTo("ann@example.com");
        assertThat(InvitationService.isValidEmail("ann.o+tag@sub.example.com")).isTrue();
        assertThat(InvitationService.isValidEmail("ann@localhost")).isFalse();
        assertThat(InvitationService.isValidEmail("no-at-sign")).isFalse();
        assertThat(InvitationService.isValidEmail("a b@example.com")).isFalse();
        assertThat(InvitationService.isValidEmail("@example.com")).isFalse();
        assertThat(InvitationService.isValidEmail("a".repeat(250) + "@x.io")).isFalse();
    }

    @Test
    void masksCandidateEmail() {
        assertThat(PublicInvitationService.mask("ann@example.com")).isEqualTo("a***@example.com");
        assertThat(PublicInvitationService.mask("a@example.com")).isEqualTo("*@example.com");
    }
}
