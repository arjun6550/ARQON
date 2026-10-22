package com.arqon.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Credentials of the schema OWNER role used only by Flyway. The app itself runs as the non-owner arqon_app role. */
@ConfigurationProperties("arqon.migration")
public record MigrationProperties(String url, String user, String password) {}
