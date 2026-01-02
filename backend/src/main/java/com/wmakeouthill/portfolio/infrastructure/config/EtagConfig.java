package com.wmakeouthill.portfolio.infrastructure.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

import jakarta.servlet.DispatcherType;
import java.util.EnumSet;

/**
 * Configuração para suporte a ETags (Entity Tags).
 * Permite que o browser valide se o conteúdo mudou (304 Not Modified)
 * economizando banda e processamento no cliente.
 */
@Configuration
public class EtagConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> shallowEtagHeaderFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> filterRegistrationBean = new FilterRegistrationBean<>(
                new ShallowEtagHeaderFilter());

        filterRegistrationBean.addUrlPatterns("/api/*"); // Aplica apenas nas APIs
        filterRegistrationBean.setName("etagFilter");
        // Garante que execute em requisições e forwards internos
        filterRegistrationBean.setDispatcherTypes(EnumSet.allOf(DispatcherType.class));

        return filterRegistrationBean;
    }
}
