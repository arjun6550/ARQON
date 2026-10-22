package com.arqon.core.identity.service;

import com.arqon.core.identity.config.JwtProperties;
import com.arqon.core.identity.domain.User;
import com.arqon.security.JwtClaims;
import com.nimbusds.jose.jwk.RSAKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final RSAKey rsaKey;
    private final JwtProperties jwtProperties;
    private final SecureRandom random = new SecureRandom();

    public TokenService(JwtEncoder encoder, RSAKey rsaKey, JwtProperties jwtProperties) {
        this.encoder = encoder;
        this.rsaKey = rsaKey;
        this.jwtProperties = jwtProperties;
    }

    public String issueAccessToken(User user, UUID sessionId) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(JwtClaims.ISSUER)
                .audience(List.of(JwtClaims.AUDIENCE))
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTtl()))
                .id(UUID.randomUUID().toString())
                .claim(JwtClaims.ROLE, user.getRole().name())
                .claim(JwtClaims.SESSION_ID, sessionId.toString());
        if (user.getTenantId() != null) {
            claims.claim(JwtClaims.TENANT_ID, user.getTenantId().toString());
        }
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(rsaKey.getKeyID()).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    public long accessTtlSeconds() {
        return jwtProperties.accessTtl().toSeconds();
    }

    /** 256 bits of randomness, URL-safe. Only its hash is persisted. */
    public String newRefreshTokenValue() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
