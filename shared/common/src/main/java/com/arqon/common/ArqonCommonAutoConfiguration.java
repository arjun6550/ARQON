package com.arqon.common;

import com.arqon.common.error.GlobalExceptionHandler;
import com.arqon.common.web.CorrelationIdFilter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ArqonCommonAutoConfiguration {

    /** Runs before Spring Security so even 401/403 responses carry a correlation id. */
    @Bean
    FilterRegistrationBean<CorrelationIdFilter> arqonCorrelationIdFilter() {
        FilterRegistrationBean<CorrelationIdFilter> registration = new FilterRegistrationBean<>(new CorrelationIdFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }

    @Bean
    @ConditionalOnMissingBean
    GlobalExceptionHandler arqonGlobalExceptionHandler() {
        return new GlobalExceptionHandler();
    }
}
