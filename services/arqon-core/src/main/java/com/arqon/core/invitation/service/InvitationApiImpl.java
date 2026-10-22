package com.arqon.core.invitation.service;

import com.arqon.common.security.Tokens;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.invitation.InvitationApi;
import com.arqon.core.invitation.domain.InvitationRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class InvitationApiImpl implements InvitationApi {

    private final InvitationRepository invitations;
    private final RlsSession rls;

    InvitationApiImpl(InvitationRepository invitations, RlsSession rls) {
        this.invitations = invitations;
        this.rls = rls;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InvitationInfo> findUsable(String rawToken) {
        if (!Tokens.looksLikeToken(rawToken)) return Optional.empty();
        rls.asSystem(); // lookup by secret hash across tenants; tenant then comes from the stored row
        Instant now = Instant.now();
        return invitations.findByTokenHash(Tokens.sha256Hex(rawToken)).filter(i -> i.isUsable(now))
                .map(i -> new InvitationInfo(i.getId(), i.getTenantId(), i.getAssessmentId(), i.getCandidateEmail()));
    }
}
