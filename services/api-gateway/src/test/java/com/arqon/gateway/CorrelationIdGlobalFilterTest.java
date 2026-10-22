package com.arqon.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

class CorrelationIdGlobalFilterTest {

    private final CorrelationIdGlobalFilter filter = new CorrelationIdGlobalFilter();

    @Test
    void addsCorrelationIdAndStripsUntrustedHeaders() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/identity/ping")
                .header("X-Tenant-Id", "attacker-tenant")
                .header("X-User-Roles", "SUPER_ADMIN")
                .build());
        AtomicReference<ServerWebExchange> seen = new AtomicReference<>();
        GatewayFilterChain chain = ex -> { seen.set(ex); return Mono.empty(); };

        filter.filter(exchange, chain).block();
        exchange.getResponse().setComplete().block(); // triggers beforeCommit

        var forwarded = seen.get().getRequest().getHeaders();
        assertThat(forwarded.getFirst("X-Correlation-Id")).isNotBlank();
        assertThat(forwarded.containsKey("X-Tenant-Id")).isFalse();
        assertThat(forwarded.containsKey("X-User-Roles")).isFalse();
        assertThat(exchange.getResponse().getHeaders().getFirst("X-Correlation-Id"))
                .isEqualTo(forwarded.getFirst("X-Correlation-Id"));
    }

    @Test
    void keepsValidIncomingIdAndReplacesMalformedOne() {
        MockServerWebExchange good = MockServerWebExchange.from(MockServerHttpRequest.get("/x").header("X-Correlation-Id", "abc-12345-XYZ").build());
        AtomicReference<ServerWebExchange> seen = new AtomicReference<>();
        filter.filter(good, ex -> { seen.set(ex); return Mono.empty(); }).block();
        assertThat(seen.get().getRequest().getHeaders().getFirst("X-Correlation-Id")).isEqualTo("abc-12345-XYZ");

        MockServerWebExchange bad = MockServerWebExchange.from(MockServerHttpRequest.get("/x").header("X-Correlation-Id", "bad id with spaces").build());
        filter.filter(bad, ex -> { seen.set(ex); return Mono.empty(); }).block();
        assertThat(seen.get().getRequest().getHeaders().getFirst("X-Correlation-Id")).doesNotContain(" ");
    }
}
