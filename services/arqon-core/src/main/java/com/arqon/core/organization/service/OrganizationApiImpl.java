package com.arqon.core.organization.service;

import com.arqon.common.tenant.RlsSession;
import com.arqon.core.organization.OrganizationApi;
import com.arqon.core.organization.domain.OrganizationRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class OrganizationApiImpl implements OrganizationApi {

    private final OrganizationRepository organizations;
    private final RlsSession rls;

    OrganizationApiImpl(OrganizationRepository organizations, RlsSession rls) {
        this.organizations = organizations;
        this.rls = rls;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsActive(UUID organizationId) {
        rls.asSystem(); // existence check on behalf of a platform admin
        return organizations.findById(organizationId).map(o -> "ACTIVE".equals(o.getStatus())).orElse(false);
    }
}
