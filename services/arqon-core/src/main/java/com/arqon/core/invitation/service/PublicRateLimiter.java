package com.arqon.core.invitation.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.core.invitation.config.InvitationProperties;
import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * PLACEHOLDER / NOT PRODUCTION READY: fixed-window, in-memory, per instance. It slows token guessing on a single node;
 * the gateway's Redis limiter and a shared (Redis) limiter here are the production answer (ADR-0023).
 */
@Component
public class PublicRateLimiter {

    private record Window(long minute, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int limit;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public PublicRateLimiter(InvitationProperties props) {
        this(props.resolvePerMinutePerIp(), Clock.systemUTC());
    }

    PublicRateLimiter(int limit, Clock clock) {
        this.limit = limit;
        this.clock = clock;
    }

    public void check(String key) {
        long minute = clock.millis() / 60_000;
        if (windows.size() > 10_000) windows.values().removeIf(w -> w.minute() < minute);
        Window w = windows.compute(key, (k, old) -> old == null || old.minute() != minute ? new Window(minute, new AtomicInteger()) : old);
        if (w.count().incrementAndGet() > limit) {
            throw new ArqonException(ErrorCode.RATE_LIMITED, "Too many requests. Try again in a minute.");
        }
    }
}
