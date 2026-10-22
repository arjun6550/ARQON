package com.arqon.core.identity.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * First Platform Super Admin is created at startup only if credentials are provided and none exists yet.
 * Reads from environment variable ARQON_BOOTSTRAP_ADMIN_PASSWORD or arqon.bootstrap-admin.password.
 */
@ConfigurationProperties("arqon.bootstrap-admin")
public record BootstrapAdminProperties(
        @DefaultValue("Arjun Shinde") String name,
        @DefaultValue("arjunnshinde9@gmail.com") String email,
        String password
) {}
