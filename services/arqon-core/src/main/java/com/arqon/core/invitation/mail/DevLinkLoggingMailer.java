package com.arqon.core.invitation.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * LOCAL DEV ONLY (PLACEHOLDER / NOT PRODUCTION READY). Prints the invitation link, which contains the raw token,
 * so the flow can be tried without a mail server. Enabled only by arqon.invitation.dev-log-links=true and refused in prod.
 */
public class DevLinkLoggingMailer implements InvitationMailer {

    private static final Logger log = LoggerFactory.getLogger(DevLinkLoggingMailer.class);
    private final InvitationMailer delegate;

    public DevLinkLoggingMailer(InvitationMailer delegate) {
        this.delegate = delegate;
    }

    @Override
    public void send(InvitationMail mail) {
        log.warn("LOCAL DEV ONLY. Invitation link for {}: {}", mail.to(), mail.link());
        delegate.send(mail);
    }
}
