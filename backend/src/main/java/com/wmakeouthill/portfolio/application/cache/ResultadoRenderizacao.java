package com.wmakeouthill.portfolio.application.cache;

/**
 * Resultado bruto de uma renderização SSR (HTML + status HTTP) devolvido pelo
 * renderer Node, antes de qualquer política de cache.
 */
public record ResultadoRenderizacao(String html, int status) {

  public boolean cacheavel() {
    return status == 200 && html != null && !html.isBlank();
  }
}
