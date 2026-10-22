package com.arqon.gateway;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

/** Gateway-level errors (no route, upstream down, rate limited) in the same body shape as the services. */
@Component
@Order(-2) // before Boot's DefaultErrorWebExceptionHandler (-1)
public class GatewayErrorHandler implements WebExceptionHandler {

    record Body(Instant timestamp, int status, String code, String message, String traceId, List<Object> details) {}

    private final ObjectMapper mapper;

    public GatewayErrorHandler(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.error(ex);
        }
        HttpStatusCode status = ex instanceof ResponseStatusException rse ? rse.getStatusCode() : HttpStatus.INTERNAL_SERVER_ERROR;
        int code = status.value();
        String traceId = exchange.getRequest().getHeaders().getFirst(CorrelationIdGlobalFilter.HEADER);
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }
        Body body = new Body(Instant.now(), code, codeFor(code), messageFor(code), traceId, List.of());

        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        exchange.getResponse().getHeaders().set(CorrelationIdGlobalFilter.HEADER, traceId);
        try {
            DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(mapper.writeValueAsBytes(body));
            return exchange.getResponse().writeWith(Mono.just(buffer));
        } catch (JsonProcessingException e) {
            return exchange.getResponse().setComplete();
        }
    }

    private static String codeFor(int status) {
        return switch (status) {
            case 404 -> "NOT_FOUND";
            case 429 -> "RATE_LIMITED";
            case 502, 503, 504 -> "UPSTREAM_UNAVAILABLE";
            default -> status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
        };
    }

    private static String messageFor(int status) {
        return switch (status) {
            case 404 -> "Resource not found";
            case 429 -> "Too many requests";
            case 502, 503, 504 -> "Service temporarily unavailable";
            default -> status >= 500 ? "An unexpected error occurred" : "Request failed";
        };
    }
}
