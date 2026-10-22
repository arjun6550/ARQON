package com.arqon.gateway;

import java.net.InetSocketAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.support.ipresolver.XForwardedRemoteAddressResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimitConfig {

    /**
     * IP-based key. Behind a load balancer set arqon.gateway.trusted-proxy-hops to the number of trusted
     * proxies so X-Forwarded-For is honoured safely; with 0 (local) the socket address is used.
     * The Redis limiter fails OPEN if Redis is unavailable (candidates must not be blocked by a cache outage);
     * login/OTP abuse is additionally limited per account in the Identity service (Slice 1.1).
     */
    @Bean
    KeyResolver ipKeyResolver(@Value("${arqon.gateway.trusted-proxy-hops:0}") int trustedHops) {
        XForwardedRemoteAddressResolver forwarded = trustedHops > 0 ? XForwardedRemoteAddressResolver.maxTrustedIndex(trustedHops) : null;
        return exchange -> {
            InetSocketAddress address = forwarded != null ? forwarded.resolve(exchange) : exchange.getRequest().getRemoteAddress();
            String key = (address == null || address.getAddress() == null) ? "unknown" : address.getAddress().getHostAddress();
            return Mono.just(key);
        };
    }
}
