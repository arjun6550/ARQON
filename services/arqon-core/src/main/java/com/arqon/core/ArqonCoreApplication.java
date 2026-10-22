package com.arqon.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The ARQON modular monolith. Modules live in their own packages with their own DB schema:
 *   com.arqon.core.identity      -> schema "identity"
 *   com.arqon.core.organization  -> schema "org"
 * Modules talk only through a module's published API (e.g. organization.OrganizationApi); this is enforced by ModuleBoundaryTest.
 */
@SpringBootApplication
public class ArqonCoreApplication {
    public static void main(String[] args) {
        // Always run in UTC. PostgreSQL rejects legacy JVM zone ids such as "Asia/Calcutta" (renamed "Asia/Kolkata"),
        // and a server must not depend on the host's timezone anyway (all timestamps are stored as timestamptz).
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("UTC"));
        SpringApplication.run(ArqonCoreApplication.class, args);
    }
}
