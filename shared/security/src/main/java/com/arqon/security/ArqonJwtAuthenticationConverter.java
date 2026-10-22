package com.arqon.security;

import java.util.ArrayList;
import java.util.List;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** Turns the verified JWT's role claim into ROLE_* and PERM_* authorities. Unknown roles get no authorities. */
public class ArqonJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        String roleClaim = jwt.getClaimAsString(JwtClaims.ROLE);
        if (roleClaim != null) {
            try {
                Role role = Role.valueOf(roleClaim);
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
                RolePermissions.of(role).forEach(p -> authorities.add(new SimpleGrantedAuthority(p.authority())));
            } catch (IllegalArgumentException ignored) {
                // unknown role -> no authorities (deny)
            }
        }
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
