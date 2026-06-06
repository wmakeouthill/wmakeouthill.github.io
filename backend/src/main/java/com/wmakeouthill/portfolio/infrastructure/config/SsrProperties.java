package com.wmakeouthill.portfolio.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Configuração tipada do edge SSR e dos caches em memória (Caffeine).
 *
 * Mapeia o prefixo {@code ssr.*} de application.properties. Os valores default
 * garantem que a aplicação suba mesmo sem todas as chaves definidas (ex.: em
 * testes), com SSR desligado por padrão (rollback seguro).
 */
@ConfigurationProperties(prefix = "ssr")
public record SsrProperties(
    @DefaultValue("false") boolean enabled,
    @DefaultValue("false") boolean bypass,
    @DefaultValue Renderer renderer,
    @DefaultValue Cache cache) {

  public record Renderer(
      @DefaultValue("http://127.0.0.1:4000") String url,
      @DefaultValue("5") int timeoutSeconds) {

    /** Base do renderer sem barra final, para concatenar o path da rota. */
    public String baseUrlSemBarraFinal() {
      if (url == null || url.isBlank()) {
        return "";
      }
      return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
  }

  public record Cache(
      @DefaultValue("2") int lockWaitSeconds,
      @DefaultValue Html html,
      @DefaultValue Data data,
      @DefaultValue Markdown markdown,
      @DefaultValue Mermaid mermaid,
      @DefaultValue Warmup warmup) {
  }

  public record Html(
      @DefaultValue("900") int ttlSeconds,
      @DefaultValue("86400") int staleSeconds,
      @DefaultValue("500") int maxEntries) {
  }

  public record Data(
      @DefaultValue("300") int ttlSeconds,
      @DefaultValue("3600") int staleSeconds,
      @DefaultValue("500") int maxEntries) {
  }

  public record Markdown(
      @DefaultValue("21600") int ttlSeconds,
      @DefaultValue("200") int maxEntries) {
  }

  public record Mermaid(
      @DefaultValue("86400") int ttlSeconds,
      @DefaultValue("500") int maxEntries) {
  }

  public record Warmup(
      @DefaultValue("true") boolean enabled,
      @DefaultValue("20") int topProjects) {
  }
}
