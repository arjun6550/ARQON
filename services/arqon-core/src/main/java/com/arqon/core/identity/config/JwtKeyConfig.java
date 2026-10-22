package com.arqon.core.identity.config;

import com.arqon.security.ArqonJwtValidators;
import com.arqon.security.JwtClaims;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.io.InputStream;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.converter.RsaKeyConverters;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
@EnableConfigurationProperties({JwtProperties.class, AuthProperties.class, BootstrapAdminProperties.class})
class JwtKeyConfig {

    @Bean
    RSAKey rsaKey(JwtProperties props) throws Exception {
        if (props.privateKeyLocation() != null && props.publicKeyLocation() != null) {
            RSAPrivateKey privateKey;
            RSAPublicKey publicKey;
            try (InputStream in = props.privateKeyLocation().getInputStream()) {
                privateKey = RsaKeyConverters.pkcs8().convert(in);
            }
            try (InputStream in = props.publicKeyLocation().getInputStream()) {
                publicKey = RsaKeyConverters.x509().convert(in);
            }
            return new RSAKey.Builder(publicKey).privateKey(privateKey).keyID(props.keyId()).build();
        }
        if (props.generateEphemeral()) {
            // LOCAL/TEST ONLY: tokens become invalid on restart and other instances cannot validate them.
            return new RSAKeyGenerator(2048).keyID(UUID.randomUUID().toString()).generate();
        }
        throw new IllegalStateException("JWT signing key is not configured (arqon.jwt.private-key-location / public-key-location)");
    }

    @Bean
    JwtEncoder jwtEncoder(RSAKey rsaKey) {
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsaKey)));
    }

    @Bean
    JwtDecoder jwtDecoder(RSAKey rsaKey) throws Exception {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
        decoder.setJwtValidator(ArqonJwtValidators.create(JwtClaims.ISSUER, JwtClaims.AUDIENCE));
        return decoder;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }
}
