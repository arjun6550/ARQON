package com.arqon.core.invitation.mail;

import java.time.Instant;

/** Everything the mailer needs. The link contains the raw token, so toString() never prints it. */
public record InvitationMail(String to, String assessmentTitle, String link, Instant windowStart, Instant windowEnd,
                             int durationMinutes, Instant expiresAt) {
    @Override
    public String toString() {
        return "InvitationMail[to=" + to + ", assessment=" + assessmentTitle + ", link=<redacted>]";
    }
}
