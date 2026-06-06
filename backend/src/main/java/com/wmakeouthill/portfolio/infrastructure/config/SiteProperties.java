package com.wmakeouthill.portfolio.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Domínio público canônico do site, usado para canonical/hreflang, Open Graph,
 * JSON-LD e sitemap. Sobrescreva via env {@code PUBLIC_SITE_BASE_URL} em produção.
 */
@ConfigurationProperties(prefix = "public.site")
public record SiteProperties(
    @DefaultValue("https://wmakeouthill.dev") String baseUrl) {

  /** Base URL sem barra final, para concatenar caminhos com segurança. */
  public String baseUrlSemBarraFinal() {
    if (baseUrl == null || baseUrl.isBlank()) {
      return "";
    }
    return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
  }
}
