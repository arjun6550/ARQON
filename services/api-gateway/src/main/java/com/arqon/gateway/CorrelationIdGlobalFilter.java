package com.arqon.gateway;

import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * - Ensures every proxied request carries a well-formed X-Correlation-Id and echoes it on the response.
 * - Strips client-supplied tenant headers: tenant identity must come from verified tokens, never the client.
 * The gateway is NOT the only authorization boundary; each service re-validates the JWT (Slice 1.1).
 */
@Component
public class CorrelationIdGlobalFilter implements GlobalFilter, Ordered {

    public static final String HEADER = "X-Correlation-Id";
    static final String[] UNTRUSTED_HEADERS = {"X-Tenant-Id", "X-User-Id", "X-User-Roles"};
    private static final Pattern VALID = Pattern.compile("^[A-Za-z0-9._-]{8,64}$");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String incoming = exchange.getRequest().getHeaders().getFirst(HEADER);
        String id = (incoming != null && VALID.matcher(incoming).matches()) ? incoming : UUID.randomUUID().toString();

        ServerHttpRequest request = exchange.getRequest().mutate().headers(h -> {
            h.set(HEADER, id);
            for (String untrusted : UNTRUSTED_HEADERS) {
                h.remove(untrusted);
            }
        }).build();

        // beforeCommit avoids duplicate header values when the upstream also echoes the id.
        exchange.getResponse().beforeCommit(() -> {
            exchange.getResponse().getHeaders().set(HEADER, id);
            return Mono.empty();
        });
        return chain.filter(exchange.mutate().request(request).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
