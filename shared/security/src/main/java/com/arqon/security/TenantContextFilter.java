package com.arqon.security;

import com.arqon.common.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Populates TenantContext from the VERIFIED JWT only. Never reads tenant info from the request itself.
 * Instantiated inside the security filter chain (not a Spring bean) so it is not auto-registered twice.
 */
public class TenantContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                String tenant = jwtAuth.getToken().getClaimAsString(JwtClaims.TENANT_ID);
                if (tenant != null) {
                    try {
                        TenantContext.set(UUID.fromString(tenant));
                    } catch (IllegalArgumentException ignored) {
                        // malformed tenant claim from a signed token should be impossible; leave context empty (fail closed)
                    }
                } else {
                    // Super Admin has universal access and may optionally scope operations to an active tenant
                    String role = jwtAuth.getToken().getClaimAsString(JwtClaims.ROLE);
                    if ("SUPER_ADMIN".equals(role)) {
                        String tenantHeader = request.getHeader("X-Tenant-Id");
                        if (tenantHeader != null && !tenantHeader.isBlank()) {
                            try {
                                TenantContext.set(UUID.fromString(tenantHeader.trim()));
                            } catch (IllegalArgumentException ignored) {
                            }
                        }
                    }
                }
            }
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
