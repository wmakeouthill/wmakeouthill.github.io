package com.wmakeouthill.portfolio.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuração global de CORS para permitir que o portfólio
 * (hospedado em GitHub Pages ou em outro domínio) chame o backend de chat.
 */
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                registry.addMapping("/api/**")
                        // Permite apenas domínios específicos (mais seguro)
                        .allowedOriginPatterns(
                                "https://wmakeouthill.github.io",
                                "https://projeto-wesley-263590688560.southamerica-east1.run.app",
                                "http://localhost:*",
                                "http://127.0.0.1:*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        .allowedHeaders("*")
                        .exposedHeaders("*")
                        .allowCredentials(false)
                        .maxAge(3600); // Cache preflight por 1 hora
            }
        };
    }
}
