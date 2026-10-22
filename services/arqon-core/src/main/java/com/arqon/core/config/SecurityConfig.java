package com.arqon.core.config;

import com.arqon.security.ApiSecurity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/** Deny by default. Fine-grained authorization is @PreAuthorize on each endpoint (permissions), never only here. */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, ObjectMapper mapper) throws Exception {
        ApiSecurity.apply(http, mapper)
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout",
                                "/api/v1/public/invitations/resolve", "/api/v1/public/exam/start", "/api/v1/public/exam/submit").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/exam/session").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/public/exam/answers/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/.well-known/jwks.json", "/api/v1/system/ping").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll() // disabled in prod
                        .anyRequest().authenticated());
        return http.build();
    }
}
