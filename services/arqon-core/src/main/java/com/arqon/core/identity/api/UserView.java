package com.arqon.core.identity.api;

import com.arqon.core.identity.domain.User;
import com.arqon.security.Role;
import java.util.UUID;

public record UserView(UUID id, String email, Role role, UUID tenantId) {
    static UserView from(User u) {
        return new UserView(u.getId(), u.getEmail(), u.getRole(), u.getTenantId());
    }
}
