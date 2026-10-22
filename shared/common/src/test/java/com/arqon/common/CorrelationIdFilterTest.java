package com.arqon.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.arqon.common.web.CorrelationIdFilter;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CorrelationIdFilterTest {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    private String run(String incomingHeader, AtomicReference<String> mdcDuring) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest();
        if (incomingHeader != null) {
            req.addHeader(CorrelationIdFilter.HEADER, incomingHeader);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, (r, s) -> mdcDuring.set(MDC.get(CorrelationIdFilter.MDC_KEY)));
        return res.getHeader(CorrelationIdFilter.HEADER);
    }

    @Test
    void generatesIdWhenMissing() throws Exception {
        AtomicReference<String> mdc = new AtomicReference<>();
        String header = run(null, mdc);
        assertThat(header).isNotBlank();
        assertThat(mdc.get()).isEqualTo(header);
    }

    @Test
    void keepsWellFormedIncomingId() throws Exception {
        AtomicReference<String> mdc = new AtomicReference<>();
        assertThat(run("abc-12345-XYZ", mdc)).isEqualTo("abc-12345-XYZ");
    }

    @Test
    void replacesMalformedIdToPreventLogInjection() throws Exception {
        AtomicReference<String> mdc = new AtomicReference<>();
        String header = run("evil\nINFO fake log line", mdc);
        assertThat(header).doesNotContain("evil").doesNotContain("\n");
    }

    @Test
    void clearsMdcAfterRequest() throws Exception {
        run(null, new AtomicReference<>());
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }
}
