package com.arqon.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("arqon.security")
public record ArqonSecurityProperties(
        String jwksUri,
        @DefaultValue(JwtClaims.ISSUER) String issuer,
        @DefaultValue(JwtClaims.AUDIENCE) String audience) {}
