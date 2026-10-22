package com.arqon.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ResponseStatusException;

class GatewayErrorHandlerTest {

    private final GatewayErrorHandler handler = new GatewayErrorHandler(
            JsonMapper.builder().addModule(new JavaTimeModule()).disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS).build());

    @Test
    void unknownRouteGivesUniformNotFoundBody() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/nope"));
        handler.handle(exchange, new ResponseStatusException(HttpStatus.NOT_FOUND, "internal detail")).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        String body = exchange.getResponse().getBodyAsString().block();
        assertThat(body).contains("\"code\":\"NOT_FOUND\"").doesNotContain("internal detail");
        assertThat(exchange.getResponse().getHeaders().getFirst("X-Correlation-Id")).isNotBlank();
    }

    @Test
    void upstreamFailureHidesInfrastructureDetails() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/identity/ping"));
        handler.handle(exchange, new IllegalStateException("Connection refused: identity-service:8081")).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(exchange.getResponse().getBodyAsString().block()).doesNotContain("identity-service:8081");
    }
}
