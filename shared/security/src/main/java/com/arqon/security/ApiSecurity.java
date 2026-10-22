package com.arqon.security;

import com.arqon.common.error.ApiError;
import com.arqon.common.error.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

/** Common HttpSecurity setup: stateless bearer JWT, uniform JSON 401/403, tenant context from the token. */
public final class ApiSecurity {

    private ApiSecurity() {}

    public static HttpSecurity apply(HttpSecurity http, ObjectMapper mapper) throws Exception {
        AuthenticationEntryPoint unauthorized = (req, res, ex) -> write(res, mapper, ErrorCode.UNAUTHENTICATED, "Authentication required");
        AccessDeniedHandler forbidden = (req, res, ex) -> write(res, mapper, ErrorCode.FORBIDDEN, "Access denied");
        return http
                // Bearer-token API (no ambient cookie authority). Cookie endpoints (refresh/logout) use a custom-header check instead.
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(o -> o
                        .jwt(j -> j.jwtAuthenticationConverter(new ArqonJwtAuthenticationConverter()))
                        .authenticationEntryPoint(unauthorized)
                        .accessDeniedHandler(forbidden))
                .exceptionHandling(e -> e.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .addFilterAfter(new TenantContextFilter(), BearerTokenAuthenticationFilter.class);
    }

    private static void write(HttpServletResponse res, ObjectMapper mapper, ErrorCode code, String message) throws IOException {
        res.setStatus(code.getStatus().value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(res.getOutputStream(), ApiError.of(code, message, List.of()));
    }
}
