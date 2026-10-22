package com.arqon.core.invitation.domain;

/** Stored status. "Expired" is derived from expiresAt (see Invitation.effectiveStatus), never stored. */
public enum InvitationStatus { PENDING, OPENED, REVOKED }
