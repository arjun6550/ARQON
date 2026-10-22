package com.arqon.core.invitation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class PublicRateLimiterTest {

    @Test
    void blocksAfterLimitPerKeyAndResetsNextMinute() {
        long[] now = {Instant.parse("2030-01-01T00:00:10Z").toEpochMilli()};
        Clock clock = new Clock() {
            @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId z) { return this; }
            @Override public Instant instant() { return Instant.ofEpochMilli(now[0]); }
        };
        PublicRateLimiter limiter = new PublicRateLimiter(3, clock);
        for (int i = 0; i < 3; i++) limiter.check("1.1.1.1");
        assertThatThrownBy(() -> limiter.check("1.1.1.1")).isInstanceOfSatisfying(ArqonException.class,
                e -> assertThat(e.getCode()).isEqualTo(ErrorCode.RATE_LIMITED));
        limiter.check("2.2.2.2"); // other client unaffected
        now[0] += 60_000;
        limiter.check("1.1.1.1"); // new window
    }
}
