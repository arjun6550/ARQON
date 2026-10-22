package com.arqon.core.invitation.service;

import com.arqon.core.invitation.mail.InvitationMail;
import java.util.UUID;

/** In-process only (never persisted/published): carries the raw token from the transaction to the after-commit mailer. */
record InvitationIssuedEvent(UUID tenantId, UUID invitationId, InvitationMail mail) {
    @Override
    public String toString() {
        return "InvitationIssuedEvent[invitationId=" + invitationId + "]";
    }
}
