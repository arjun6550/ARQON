package com.arqon.core.organization;

import java.util.UUID;

/**
 * The ONLY entry point other modules may use to talk to the organization module.
 * Everything else under com.arqon.core.organization.* is internal (enforced by ModuleBoundaryTest).
 * If the module is ever extracted into its own service, this interface becomes the remote client.
 */
public interface OrganizationApi {
    boolean existsActive(UUID organizationId);
}
