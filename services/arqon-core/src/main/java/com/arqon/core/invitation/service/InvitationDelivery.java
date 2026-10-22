package com.arqon.core.invitation.service;

import com.arqon.common.tenant.RlsSession;
import com.arqon.core.invitation.domain.InvitationRepository;
import com.arqon.core.invitation.mail.InvitationMailer;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends the e-mail only AFTER the invitation transaction committed (a rolled-back invitation never sends mail),
 * then records SENT/FAILED in a new transaction. A failure never fails the API call; the recruiter sees FAILED and can resend.
 * Sending is synchronous (bounded by the SMTP timeouts) - a queue/worker is the production upgrade (ADR-0023).
 */
@Component
class InvitationDelivery {

    private static final Logger log = LoggerFactory.getLogger(InvitationDelivery.class);

    private final InvitationMailer mailer;
    private final InvitationRepository invitations;
    private final RlsSession rls;
    private final TransactionTemplate newTx;

    InvitationDelivery(InvitationMailer mailer, InvitationRepository invitations, RlsSession rls, PlatformTransactionManager tm) {
        this.mailer = mailer;
        this.invitations = invitations;
        this.rls = rls;
        this.newTx = new TransactionTemplate(tm);
        this.newTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onIssued(InvitationIssuedEvent event) {
        boolean sent = false;
        try {
            mailer.send(event.mail());
            sent = true;
        } catch (RuntimeException e) {
            log.warn("Invitation e-mail failed for invitation {}: {}", event.invitationId(), e.getClass().getSimpleName());
        }
        record(event, sent);
    }

    private void record(InvitationIssuedEvent event, boolean sent) {
        newTx.executeWithoutResult(status -> {
            rls.asTenant(event.tenantId());
            invitations.findById(event.invitationId()).ifPresent(i -> {
                if (sent) i.markSent(Instant.now()); else i.markSendFailed();
                invitations.save(i);
            });
        });
    }
}
