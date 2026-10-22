package com.arqon.security;

public final class JwtClaims {
    public static final String ISSUER = "https://identity.arqon.local";
    public static final String AUDIENCE = "arqon-api";
    public static final String TENANT_ID = "tenant_id";
    public static final String ROLE = "role";
    public static final String SESSION_ID = "sid";

    private JwtClaims() {}
}
