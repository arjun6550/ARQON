package com.arqon.core.invitation.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class RealtimeInvitationMailerTest {

    private JavaMailSender sender;
    private RealtimeMailOutbox outbox;
    private MimeMessage mimeMessage;

    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        mimeMessage = mock(MimeMessage.class);
        when(sender.createMimeMessage()).thenReturn(mimeMessage);
        outbox = new RealtimeMailOutbox();
    }

    @Test
    void htmlTemplateBuilderRendersBrandedEmailAndLink() {
        Instant now = Instant.now();
        var mail = new InvitationMail(
                "candidate@domain.com",
                "Senior Java Engineer Assessment",
                "http://localhost:5173/invite#token1234567890123456789012345678901234567890123",
                now,
                now.plus(3, ChronoUnit.DAYS),
                75,
                now.plus(3, ChronoUnit.DAYS)
        );

        String html = HtmlEmailTemplateBuilder.buildHtml(mail);
        String text = HtmlEmailTemplateBuilder.buildPlainText(mail);

        assertThat(html).contains("ARQON");
        assertThat(html).contains("Senior Java Engineer Assessment");
        assertThat(html).contains("candidate@domain.com");
        assertThat(html).contains("http://localhost:5173/invite#token123");
        assertThat(html).contains("75 Minutes");

        assertThat(text).contains("Senior Java Engineer Assessment");
        assertThat(text).contains("http://localhost:5173/invite#token123");
        assertThat(text).contains("75 minutes");
    }

    @Test
    void smtpMailerDeliversAndRecordsDeliveredStatus() {
        SmtpInvitationMailer mailer = new SmtpInvitationMailer(sender, "no-reply@arqon.local", outbox, false);
        Instant now = Instant.now();
        var mail = new InvitationMail(
                "candidate@test.com",
                "Backend Screening",
                "http://localhost:5173/invite#token123",
                now,
                now.plus(1, ChronoUnit.DAYS),
                60,
                now.plus(1, ChronoUnit.DAYS)
        );

        mailer.send(mail);

        verify(sender).send(any(MimeMessage.class));
        assertThat(outbox.getAllRecent()).hasSize(1);
        var record = outbox.getAllRecent().get(0);
        assertThat(record.recipientEmail()).isEqualTo("candidate@test.com");
        assertThat(record.status()).isEqualTo("DELIVERED");
        assertThat(record.deliveryMethod()).isEqualTo("REAL_SMTP");
        assertThat(record.candidateLink()).contains("token123");
    }

    @Test
    void smtpMailerFallsBackToInternalStreamWhenOfflineInLocalProfile() {
        doThrow(new MailSendException("Connection refused")).when(sender).send(any(MimeMessage.class));
        SmtpInvitationMailer mailer = new SmtpInvitationMailer(sender, "no-reply@arqon.local", outbox, false);
        Instant now = Instant.now();
        var mail = new InvitationMail(
                "candidate@test.com",
                "Backend Screening",
                "http://localhost:5173/invite#token123",
                now,
                now.plus(1, ChronoUnit.DAYS),
                60,
                now.plus(1, ChronoUnit.DAYS)
        );

        // Should not throw in local mode; instead captures in internal stream
        mailer.send(mail);

        assertThat(outbox.getAllRecent()).hasSize(1);
        var record = outbox.getAllRecent().get(0);
        assertThat(record.recipientEmail()).isEqualTo("candidate@test.com");
        assertThat(record.status()).isEqualTo("DELIVERED");
        assertThat(record.deliveryMethod()).isEqualTo("INTERNAL_STREAM");
        assertThat(record.errorMessage()).contains("Connection refused");
    }

    @Test
    void outboxLimitsHistoryCapacity() {
        for (int i = 0; i < 200; i++) {
            outbox.record(new RealtimeMailMessage(
                    java.util.UUID.randomUUID(),
                    "user" + i + "@test.com",
                    "Title",
                    "Subject",
                    "http://localhost:5173/invite#token",
                    Instant.now(),
                    "DELIVERED",
                    "REAL_SMTP",
                    null,
                    "<html></html>"
            ));
        }

        assertThat(outbox.getAllRecent()).hasSize(150);
        assertThat(outbox.getAllRecent().get(0).recipientEmail()).isEqualTo("user199@test.com");
    }
}
