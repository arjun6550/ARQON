package com.arqon.core.identity.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.core.io.Resource;

/** Signing key comes from PEM files (prod: mounted secret). generate-ephemeral is for local/test only. */
@ConfigurationProperties("arqon.jwt")
public record JwtProperties(
        Resource privateKeyLocation,
        Resource publicKeyLocation,
        @DefaultValue("arqon-key-1") String keyId,
        @DefaultValue("false") boolean generateEphemeral,
        @DefaultValue("10m") Duration accessTtl) {}
