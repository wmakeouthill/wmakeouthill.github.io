package com.wmakeouthill.portfolio.application.cache;

/**
 * Estado de uma resposta servida pelo edge SSR, exposto no header {@code X-Cache}.
 */
public enum StatusCache {
  /** Servido do cache, ainda fresco. */
  HIT,
  /** Gerado agora (cache-miss) e armazenado. */
  MISS,
  /** Servido do cache expirado (dentro da janela stale) com refresh em background. */
  STALE,
  /** Cache ignorado por flag de rollback (ssr.bypass). */
  BYPASS
}
