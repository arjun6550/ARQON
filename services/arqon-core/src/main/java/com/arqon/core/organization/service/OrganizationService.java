package com.arqon.core.organization.service;

import com.arqon.common.api.PageResponse;
import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.organization.domain.Organization;
import com.arqon.core.organization.domain.OrganizationRepository;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationService {

    private final OrganizationRepository organizations;
    private final RlsSession rls;

    public OrganizationService(OrganizationRepository organizations, RlsSession rls) {
        this.organizations = organizations;
        this.rls = rls;
    }

    /** Platform-level operation (SUPER_ADMIN only; enforced by the controller's @PreAuthorize). */
    @Transactional
    public Organization create(String name, String slug, UUID createdBy) {
        rls.asSystem();
        if (organizations.existsBySlug(slug)) {
            throw new ArqonException(ErrorCode.CONFLICT, "Slug is already in use");
        }
        try {
            return organizations.saveAndFlush(new Organization(name.trim(), slug, createdBy));
        } catch (DataIntegrityViolationException e) {
            throw new ArqonException(ErrorCode.CONFLICT, "Slug is already in use");
        }
    }

    /**
     * Platform-level operation: update organization lifecycle status (ACTIVE or SUSPENDED).
     */
    @Transactional
    public Organization updateStatus(UUID id, String status, UUID actorId) {
        rls.asSystem();
        Organization org = organizations.findById(id)
                .orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Organization not found"));
        org.updateStatus(status);
        return organizations.save(org);
    }

    /**
     * Tenant users can only ever see their own organization: RLS makes other tenants' rows invisible, so asking for
     * another id returns 404 (not 403) and does not reveal whether it exists.
     */
    @Transactional(readOnly = true)
    public Organization get(UUID id, boolean allTenants, UUID callerTenant) {
        if (allTenants) {
            rls.asSystem();
        } else {
            if (callerTenant == null) {
                throw new ArqonException(ErrorCode.FORBIDDEN, "Access denied");
            }
            rls.asTenant(callerTenant);
        }
        return organizations.findById(id).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Organization not found"));
    }

    @Transactional(readOnly = true)
    public PageResponse<Organization> list(int page, int size) {
        rls.asSystem();
        Page<Organization> result = organizations.findAll(PageRequest.of(page, size, Sort.by("createdAt")));
        return new PageResponse<>(result.getContent(), page, size, result.getTotalElements());
    }
}
