package com.wmakeouthill.portfolio.application.cache;

/**
 * Resposta do edge SSR pronta para o controller traduzir em {@code ResponseEntity}:
 * HTML final, status HTTP, ETag (para revalidação condicional) e o estado de
 * cache que vira o header {@code X-Cache}.
 */
public record RespostaPaginaPublica(
    String html,
    int status,
    String etag,
    StatusCache statusCache) {
}
