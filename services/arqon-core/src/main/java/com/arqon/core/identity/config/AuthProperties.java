package com.arqon.core.identity.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("arqon.auth")
public record AuthProperties(
        @DefaultValue("12h") Duration refreshTtl,
        @DefaultValue("true") boolean cookieSecure,
        @DefaultValue("5") int maxFailedAttempts,
        @DefaultValue("15m") Duration lockDuration) {}
