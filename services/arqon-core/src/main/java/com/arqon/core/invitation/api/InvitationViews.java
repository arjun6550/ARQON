package com.arqon.core.invitation.api;

import com.arqon.core.assessment.AssessmentApi.AssessmentInfo;
import com.arqon.core.invitation.domain.Invitation;
import com.arqon.core.invitation.service.InvitationService.CreateResult;
import com.arqon.core.invitation.service.PublicInvitationService.Resolved;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class InvitationViews {

    private InvitationViews() {}

    public record CreateRequest(@NotEmpty @Size(max = 100) List<@NotBlank @Size(max = 254) String> emails, Instant expiresAt) {}

    public record ResolveRequest(@NotBlank @Size(max = 200) String token) {}

    public record ResultView(String email, String outcome, UUID invitationId) {
        static ResultView from(CreateResult r) {
            return new ResultView(r.email(), r.outcome().name(), r.invitationId());
        }
    }

    public record CreateResponse(List<ResultView> results, int created, int skipped) {
        static CreateResponse from(List<CreateResult> results) {
            List<ResultView> views = results.stream().map(ResultView::from).toList();
            int created = (int) views.stream().filter(v -> v.outcome().equals("CREATED")).count();
            return new CreateResponse(views, created, views.size() - created);
        }
    }

    public record InvitationView(UUID id, UUID assessmentId, String candidateEmail, String status, String emailStatus, int sendCount,
                                 Instant expiresAt, Instant createdAt, Instant openedAt, Instant lastSentAt) {
        static InvitationView from(Invitation i, Instant now) {
            return new InvitationView(i.getId(), i.getAssessmentId(), i.getCandidateEmail(), i.effectiveStatus(now).name(),
                    i.getEmailStatus().name(), i.getSendCount(), i.getExpiresAt(), i.getCreatedAt(), i.getOpenedAt(), i.getLastSentAt());
        }
    }

    public record Requirements(boolean camera, boolean microphone, boolean emailVerification, boolean otp, boolean idUpload, boolean selfie) {}

    public record AssessmentPreview(String title, String scheduleType, Instant windowStart, Instant windowEnd, int durationMinutes,
                                    Requirements requirements) {
        static AssessmentPreview from(AssessmentInfo a) {
            return new AssessmentPreview(a.title(), a.fixedWindow() ? "FIXED_WINDOW" : "FLEXIBLE_WINDOW", a.windowStart(), a.windowEnd(),
                    a.durationMinutes(), new Requirements(a.cameraRequired(), a.microphoneRequired(), a.emailVerification(), a.otp(),
                    a.idUpload(), a.selfie()));
        }
    }

    public record ResolvedView(String candidate, AssessmentPreview assessment, Instant expiresAt, String windowState) {
        static ResolvedView from(Resolved r) {
            return new ResolvedView(r.maskedEmail(), AssessmentPreview.from(r.assessment()), r.expiresAt(), r.windowState().name());
        }
    }

    public record RealtimeMailView(
            UUID id,
            String recipientEmail,
            String assessmentTitle,
            String subject,
            String candidateLink,
            Instant sentAt,
            String status,
            String deliveryMethod,
            String errorMessage,
            String htmlContent
    ) {}

    public record SendTestMailRequest(@NotBlank @Email String email) {}

    public record SendTestMailResponse(boolean success, String recipient, String deliveryMethod, String message, Instant timestamp) {}

    public record SmtpStatusResponse(boolean configured, String host, int port, String mailFrom, String mode) {}
}
