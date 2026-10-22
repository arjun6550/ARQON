package com.arqon.core.config;

import java.time.Instant;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public connectivity probe (Browser -> Gateway -> Core). Exposes no business data. */
@RestController
@RequestMapping("/api/v1/system")
class SystemController {

    record PingResponse(String service, String status, String correlationId, Instant timestamp) {}

    @GetMapping("/ping")
    PingResponse ping() {
        return new PingResponse("arqon-core", "UP", MDC.get("correlationId"), Instant.now());
    }
}
