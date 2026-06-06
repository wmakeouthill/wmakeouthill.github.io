package com.wmakeouthill.portfolio.application.cache;

import java.time.Instant;
import java.util.Set;

/**
 * Página pública renderizada e guardada em memória, com metadados de freshness
 * para suportar stale-while-revalidate.
 *
 * <ul>
 * <li>{@code frescoAte}: até este instante a página é servida como HIT.</li>
 * <li>{@code staleAte}: após {@code frescoAte} e antes deste instante a página
 * ainda pode ser servida como STALE enquanto um refresh roda em background.</li>
 * </ul>
 */
public record PaginaCacheada(
    String html,
    int status,
    String etag,
    Instant criadoEm,
    Instant frescoAte,
    Instant staleAte,
    Set<String> tags,
    long tempoRenderMs) {

  public PaginaCacheada {
    tags = (tags == null) ? Set.of() : Set.copyOf(tags);
  }

  /** Cria uma entrada a partir do instante atual e das janelas em segundos. */
  public static PaginaCacheada criar(
      String html, int status, String etag,
      long ttlSegundos, long staleSegundos,
      Set<String> tags, long tempoRenderMs) {
    Instant agora = Instant.now();
    return new PaginaCacheada(
        html, status, etag, agora,
        agora.plusSeconds(ttlSegundos),
        agora.plusSeconds(Math.max(ttlSegundos, staleSegundos)),
        tags, tempoRenderMs);
  }

  public boolean estaFresca(Instant agora) {
    return agora.isBefore(frescoAte);
  }

  /** Expirada (não fresca) mas ainda dentro da janela de stale. */
  public boolean podeServirStale(Instant agora) {
    return !estaFresca(agora) && agora.isBefore(staleAte);
  }
}
