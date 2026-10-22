package com.arqon.core.invitation.mail;

/** Delivery abstraction. Implementations must not log the link. Throw on failure; the caller records FAILED. */
public interface InvitationMailer {
    void send(InvitationMail mail);
}
