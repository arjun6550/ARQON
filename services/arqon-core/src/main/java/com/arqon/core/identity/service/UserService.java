package com.arqon.core.identity.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.identity.domain.User;
import com.arqon.core.organization.OrganizationApi;
import com.arqon.core.identity.domain.UserRepository;
import com.arqon.security.Role;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    public record CreateCommand(String email, String password, Role role, UUID tenantId) {}

    /** SUPER_ADMIN is only ever created by bootstrap; CANDIDATE users come from invitations (Slice 1.4). */
    private static final Set<Role> CREATABLE_ROLES = EnumSet.of(Role.ORG_ADMIN, Role.RECRUITER, Role.PROCTOR);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final RlsSession rls;
    private final AuditWriter audit;
    private final OrganizationApi organizations;

    public UserService(UserRepository users, PasswordEncoder encoder, RlsSession rls, AuditWriter audit, OrganizationApi organizations) {
        this.users = users;
        this.encoder = encoder;
        this.rls = rls;
        this.audit = audit;
        this.organizations = organizations;
    }

    /**
     * The target tenant is NEVER taken from the client for tenant-bound callers: an ORG_ADMIN always creates users in
     * their own tenant (a different tenantId in the request is rejected). Only SUPER_ADMIN chooses a tenant.
     * The target organization must exist and be active (checked through the organization module's published API).
     */
    @Transactional
    public User create(Role callerRole, UUID callerId, UUID callerTenant, CreateCommand cmd, String ip) {
        if (!CREATABLE_ROLES.contains(cmd.role())) {
            throw new ArqonException(ErrorCode.VALIDATION_ERROR, "This role cannot be created through this endpoint");
        }
        UUID tenant;
        if (callerRole == Role.SUPER_ADMIN) {
            if (cmd.tenantId() == null) {
                throw new ArqonException(ErrorCode.VALIDATION_ERROR, "tenantId is required");
            }
            tenant = cmd.tenantId();
            rls.asSystem();
            if (!organizations.existsActive(tenant)) {
                throw new ArqonException(ErrorCode.VALIDATION_ERROR, "Organization does not exist or is not active");
            }
        } else {
            if (callerTenant == null) {
                throw new ArqonException(ErrorCode.FORBIDDEN, "Access denied");
            }
            if (cmd.tenantId() != null && !cmd.tenantId().equals(callerTenant)) {
                throw new ArqonException(ErrorCode.FORBIDDEN, "Access denied");
            }
            tenant = callerTenant;
            rls.asTenant(tenant);
        }
        User user = new User(tenant, cmd.email().trim().toLowerCase(Locale.ROOT), encoder.encode(cmd.password()), cmd.role(), callerId);
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new ArqonException(ErrorCode.CONFLICT, "Email is already registered");
        }
        audit.record(tenant, callerId, "USER_CREATED", "user:" + user.getId() + " role:" + cmd.role(), ip);
        return user;
    }

    @Transactional(readOnly = true)
    public Page<User> list(Role callerRole, UUID callerTenant, Pageable pageable) {
        scope(callerRole, callerTenant);
        return users.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public User get(UUID userId, Role callerRole, UUID callerTenant) {
        scope(callerRole, callerTenant);
        return users.findById(userId).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "User not found"));
    }

    private void scope(Role callerRole, UUID callerTenant) {
        if (callerRole == Role.SUPER_ADMIN) {
            rls.asSystem();
        } else if (callerTenant != null) {
            rls.asTenant(callerTenant);
        } else {
            throw new ArqonException(ErrorCode.FORBIDDEN, "Access denied");
        }
    }
}
