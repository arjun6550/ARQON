package com.arqon.core.invitation.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.security.Tokens;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.assessment.AssessmentApi;
import com.arqon.core.assessment.AssessmentApi.AssessmentInfo;
import com.arqon.core.invitation.domain.Invitation;
import com.arqon.core.invitation.domain.InvitationRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Candidate side: turns a link token into "what am I invited to". No login exists yet (the exam session is Slice 1.5),
 * so this endpoint is public, rate limited, never reveals WHY a token is unusable, and reveals no other candidate data.
 */
@Service
public class PublicInvitationService {

    public enum WindowState { UPCOMING, OPEN, ENDED }

    public record Resolved(String maskedEmail, AssessmentInfo assessment, Instant expiresAt, WindowState windowState) {}

    private static final String INVALID = "This invitation link is invalid or has expired.";

    private final InvitationRepository invitations;
    private final AssessmentApi assessments;
    private final RlsSession rls;
    private final InvitationAudit audit;

    public PublicInvitationService(InvitationRepository invitations, AssessmentApi assessments, RlsSession rls, InvitationAudit audit) {
        this.invitations = invitations;
        this.assessments = assessments;
        this.rls = rls;
        this.audit = audit;
    }

    @Transactional
    public Resolved resolve(String token, String ip) {
        if (!Tokens.looksLikeToken(token)) throw invalid();
        rls.asSystem(); // lookup by secret hash across tenants; the tenant then comes from the stored row, never from the caller
        Instant now = Instant.now();
        Invitation inv = invitations.findByTokenHash(Tokens.sha256Hex(token)).filter(i -> i.isUsable(now)).orElseThrow(PublicInvitationService::invalid);
        AssessmentInfo info = assessments.find(inv.getTenantId(), inv.getAssessmentId()).filter(AssessmentInfo::published).orElseThrow(PublicInvitationService::invalid);
        if (inv.markOpened(now)) {
            invitations.saveAndFlush(inv);
            audit.record(inv.getTenantId(), null, "invitation.opened", inv.getId(), ip);
        }
        WindowState state = now.isBefore(info.windowStart()) ? WindowState.UPCOMING : now.isBefore(info.windowEnd()) ? WindowState.OPEN : WindowState.ENDED;
        return new Resolved(mask(inv.getCandidateEmail()), info, inv.getExpiresAt(), state);
    }

    static String mask(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "*" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }

    private static ArqonException invalid() {
        return new ArqonException(ErrorCode.NOT_FOUND, INVALID);
    }
}
