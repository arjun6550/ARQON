package com.arqon.core.invitation.api;

import com.arqon.common.api.PageResponse;
import com.arqon.common.tenant.TenantContext;
import com.arqon.core.invitation.api.InvitationViews.CreateRequest;
import com.arqon.core.invitation.api.InvitationViews.CreateResponse;
import com.arqon.core.invitation.api.InvitationViews.InvitationView;
import com.arqon.core.invitation.api.InvitationViews.RealtimeMailView;
import com.arqon.core.invitation.api.InvitationViews.SendTestMailRequest;
import com.arqon.core.invitation.api.InvitationViews.SendTestMailResponse;
import com.arqon.core.invitation.api.InvitationViews.SmtpStatusResponse;
import com.arqon.core.invitation.config.InvitationProperties;
import com.arqon.core.invitation.mail.InvitationMail;
import com.arqon.core.invitation.mail.InvitationMailer;
import com.arqon.core.invitation.mail.RealtimeMailOutbox;
import com.arqon.core.invitation.service.InvitationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Validated
public class InvitationController {

    private static final String READ = "hasAuthority('PERM_INVITATION_READ') or hasRole('SUPER_ADMIN')";
    private static final String WRITE = "hasAuthority('PERM_INVITATION_WRITE') or hasRole('SUPER_ADMIN')";

    private final InvitationService service;
    private final RealtimeMailOutbox outbox;
    private final InvitationMailer mailer;
    private final InvitationProperties props;
    private final Environment env;

    public InvitationController(InvitationService service,
                                RealtimeMailOutbox outbox,
                                InvitationMailer mailer,
                                InvitationProperties props,
                                Environment env) {
        this.service = service;
        this.outbox = outbox;
        this.mailer = mailer;
        this.props = props;
        this.env = env;
    }

    @PostMapping("/assessments/{assessmentId}/invitations")
    @PreAuthorize(WRITE)
    public ResponseEntity<CreateResponse> create(@PathVariable UUID assessmentId, @Valid @RequestBody CreateRequest request,
                                                 @AuthenticationPrincipal Jwt jwt, HttpServletRequest http) {
        var results = service.create(TenantContext.require(), UUID.fromString(jwt.getSubject()), assessmentId,
                request.emails(), request.expiresAt(), http.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(CreateResponse.from(results));
    }

    @GetMapping("/assessments/{assessmentId}/invitations")
    @PreAuthorize(READ)
    public PageResponse<InvitationView> list(@PathVariable UUID assessmentId,
                                             @RequestParam(defaultValue = "0") @Min(0) int page,
                                             @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var result = service.list(TenantContext.require(), assessmentId, page, size);
        Instant now = Instant.now();
        return new PageResponse<>(result.getContent().stream().map(i -> InvitationView.from(i, now)).toList(), page, size, result.getTotalElements());
    }

    @PostMapping("/invitations/{id}/resend")
    @PreAuthorize(WRITE)
    public ResponseEntity<Void> resend(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt, HttpServletRequest http) {
        service.resend(TenantContext.require(), UUID.fromString(jwt.getSubject()), id, http.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @DeleteMapping("/invitations/{id}")
    @PreAuthorize(WRITE)
    public ResponseEntity<Void> revoke(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt, HttpServletRequest http) {
        service.revoke(TenantContext.require(), UUID.fromString(jwt.getSubject()), id, http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    /** Real-time outbox stream of dispatched candidate emails. */
    @GetMapping("/invitations/outbox")
    @PreAuthorize(READ)
    public ResponseEntity<List<RealtimeMailView>> getRealtimeOutbox() {
        var messages = outbox.getAllRecent().stream()
                .map(m -> new RealtimeMailView(
                        m.id(),
                        m.recipientEmail(),
                        m.assessmentTitle(),
                        m.subject(),
                        m.candidateLink(),
                        m.sentAt(),
                        m.status(),
                        m.deliveryMethod(),
                        m.errorMessage(),
                        m.htmlContent()
                ))
                .toList();
        return ResponseEntity.ok(messages);
    }

    /** Trigger an immediate real-time test email to verify SMTP delivery over the wire. */
    @PostMapping("/invitations/send-test-email")
    @PreAuthorize(WRITE)
    public ResponseEntity<SendTestMailResponse> sendTestEmail(@Valid @RequestBody SendTestMailRequest request) {
        Instant now = Instant.now();
        String testLink = props.baseUrl().replaceAll("/+$", "") + "/invite#test-" + UUID.randomUUID();
        var mail = new InvitationMail(
                request.email(),
                "ARQON System Verification Assessment",
                testLink,
                now,
                now.plus(7, ChronoUnit.DAYS),
                60,
                now.plus(7, ChronoUnit.DAYS)
        );

        mailer.send(mail);

        String host = env.getProperty("spring.mail.host", "localhost");
        String mode = (host != null && !host.isBlank() && !host.equals("localhost")) ? "REAL_SMTP (" + host + ")" : "ACTIVE_STREAM";

        return ResponseEntity.ok(new SendTestMailResponse(
                true,
                request.email(),
                mode,
                "Real-time test invitation email dispatched successfully to " + request.email(),
                now
        ));
    }

    /** Gateway connectivity and SMTP configuration status. */
    @GetMapping("/invitations/smtp-status")
    @PreAuthorize(READ)
    public ResponseEntity<SmtpStatusResponse> getSmtpStatus() {
        String host = env.getProperty("spring.mail.host", "localhost");
        int port = Integer.parseInt(env.getProperty("spring.mail.port", "587"));
        boolean configured = host != null && !host.isBlank();
        String mode = (configured && !host.equals("localhost")) ? "REAL_SMTP" : "REALTIME_OUTBOX_STREAM";
        return ResponseEntity.ok(new SmtpStatusResponse(
                configured,
                host,
                port,
                props.mailFrom(),
                mode
        ));
    }
}
