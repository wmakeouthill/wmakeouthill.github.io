package com.wmakeouthill.portfolio.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuração do Spring MVC para MIME types customizados.
 * Necessário para servir corretamente arquivos .mjs (JavaScript modules).
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  @Override
  public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
    configurer
        // Adiciona MIME type para arquivos .mjs (ES modules)
        .mediaType("mjs", MediaType.valueOf("application/javascript"))
        // Garante que .js também seja servido corretamente
        .mediaType("js", MediaType.valueOf("application/javascript"));
  }
}

