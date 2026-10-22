package com.arqon.core.invitation.mail;

import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

public class SmtpInvitationMailer implements InvitationMailer {

    private static final Logger log = LoggerFactory.getLogger(SmtpInvitationMailer.class);

    private final JavaMailSender sender;
    private final String from;
    private final RealtimeMailOutbox outbox;
    private final boolean prod;

    public SmtpInvitationMailer(JavaMailSender sender, String from, RealtimeMailOutbox outbox, boolean prod) {
        this.sender = sender;
        this.from = from;
        this.outbox = outbox;
        this.prod = prod;
    }

    public SmtpInvitationMailer(JavaMailSender sender, String from) {
        this(sender, from, new RealtimeMailOutbox(), false);
    }

    @Override
    public void send(InvitationMail m) {
        String html = HtmlEmailTemplateBuilder.buildHtml(m);
        String plainText = HtmlEmailTemplateBuilder.buildPlainText(m);
        String subject = "You are invited: " + m.assessmentTitle() + " | ARQON Assessment";

        if (sender != null) {
            try {
                MimeMessage mime = sender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
                helper.setFrom(from);
                helper.setTo(m.to());
                helper.setSubject(subject);
                helper.setText(plainText, html);

                sender.send(mime);

                log.info("[REALTIME MAIL] Real-time invitation delivered to {} via SMTP ('{}')", m.to(), m.assessmentTitle());
                outbox.record(new RealtimeMailMessage(
                        UUID.randomUUID(),
                        m.to(),
                        m.assessmentTitle(),
                        subject,
                        m.link(),
                        Instant.now(),
                        "DELIVERED",
                        "REAL_SMTP",
                        null,
                        html
                ));
                return;
            } catch (Exception e) {
                log.warn("[REALTIME MAIL] Real-time SMTP transmission to {} failed: {}. Fallback to real-time outbox.",
                        m.to(), e.getMessage());

                if (prod) {
                    outbox.record(new RealtimeMailMessage(
                            UUID.randomUUID(),
                            m.to(),
                            m.assessmentTitle(),
                            subject,
                            m.link(),
                            Instant.now(),
                            "FAILED",
                            "REAL_SMTP",
                            e.getMessage(),
                            html
                    ));
                    throw new RuntimeException("SMTP delivery failed: " + e.getMessage(), e);
                }

                // In local development, capture in outbox stream and mark delivered so candidate link is immediately accessible
                outbox.record(new RealtimeMailMessage(
                        UUID.randomUUID(),
                        m.to(),
                        m.assessmentTitle(),
                        subject,
                        m.link(),
                        Instant.now(),
                        "DELIVERED",
                        "INTERNAL_STREAM",
                        "SMTP offline: " + e.getMessage(),
                        html
                ));
                return;
            }
        }

        if (prod) {
            throw new IllegalStateException("spring.mail.host must be configured in the prod profile");
        }

        log.info("[REALTIME MAIL] No SMTP configured; captured invitation in real-time candidate outbox stream for {}", m.to());
        outbox.record(new RealtimeMailMessage(
                UUID.randomUUID(),
                m.to(),
                m.assessmentTitle(),
                subject,
                m.link(),
                Instant.now(),
                "DELIVERED",
                "INTERNAL_STREAM",
                "Local real-time stream (no SMTP host)",
                html
        ));
    }
}
