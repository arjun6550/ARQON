package com.arqon.core.invitation.api;

import com.arqon.core.invitation.api.InvitationViews.ResolveRequest;
import com.arqon.core.invitation.api.InvitationViews.ResolvedView;
import com.arqon.core.invitation.service.PublicInvitationService;
import com.arqon.core.invitation.service.PublicRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Unauthenticated (permitAll in SecurityConfig). POST with the token in the body so it never lands in URLs or access logs. */
@RestController
@RequestMapping("/api/v1/public/invitations")
public class PublicInvitationController {

    private final PublicInvitationService service;
    private final PublicRateLimiter limiter;

    public PublicInvitationController(PublicInvitationService service, PublicRateLimiter limiter) {
        this.service = service;
        this.limiter = limiter;
    }

    @PostMapping("/resolve")
    public ResponseEntity<ResolvedView> resolve(@Valid @RequestBody ResolveRequest request, HttpServletRequest http) {
        limiter.check(http.getRemoteAddr());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("Referrer-Policy", "no-referrer")
                .body(ResolvedView.from(service.resolve(request.token(), http.getRemoteAddr())));
    }
}
