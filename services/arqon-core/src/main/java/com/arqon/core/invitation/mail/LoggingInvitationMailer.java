package com.arqon.core.invitation.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * PLACEHOLDER / NOT PRODUCTION READY. Used only when no SMTP host is configured (local/test).
 * It deliberately does NOT print the link; use Mailpit (docker compose) to see real e-mails locally.
 */
public class LoggingInvitationMailer implements InvitationMailer {

    private static final Logger log = LoggerFactory.getLogger(LoggingInvitationMailer.class);

    @Override
    public void send(InvitationMail mail) {
        log.warn("No SMTP configured (spring.mail.host). Invitation for {} was NOT delivered. Start Mailpit and set spring.mail.host=localhost.",
                mail.to());
    }
}
