package com.arqon.core.invitation.mail;

import java.time.Instant;
import java.util.UUID;

public record RealtimeMailMessage(
        UUID id,
        String recipientEmail,
        String assessmentTitle,
        String subject,
        String candidateLink,
        Instant sentAt,
        String status, // "DELIVERED" or "FAILED"
        String deliveryMethod, // "REAL_SMTP" or "INTERNAL_STREAM"
        String errorMessage,
        String htmlContent
) {}
