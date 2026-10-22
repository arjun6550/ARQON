package com.arqon.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.arqon.common.error.ArqonException;
import com.arqon.common.tenant.TenantContext;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class TenantContextTest {

    @AfterEach
    void cleanup() { TenantContext.clear(); }

    @Test
    void setAndClear() {
        UUID id = UUID.randomUUID();
        TenantContext.set(id);
        assertThat(TenantContext.require()).isEqualTo(id);
        assertThat(MDC.get(TenantContext.MDC_KEY)).isEqualTo(id.toString());
        TenantContext.clear();
        assertThat(TenantContext.get()).isEmpty();
        assertThat(MDC.get(TenantContext.MDC_KEY)).isNull();
    }

    @Test
    void requireFailsClosedWhenMissing() {
        assertThatThrownBy(TenantContext::require).isInstanceOf(ArqonException.class);
    }
}
