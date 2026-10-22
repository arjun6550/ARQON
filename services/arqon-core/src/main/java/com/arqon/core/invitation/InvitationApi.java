package com.arqon.core.invitation;

import java.util.Optional;
import java.util.UUID;

/** Published API of the invitation module: lets the exam module turn a raw link token into "who is invited to what". */
public interface InvitationApi {

    record InvitationInfo(UUID invitationId, UUID tenantId, UUID assessmentId, String candidateEmail) {}

    /** Empty when the token is malformed, unknown, expired, revoked or replaced. Never says which. */
    Optional<InvitationInfo> findUsable(String rawToken);
}
