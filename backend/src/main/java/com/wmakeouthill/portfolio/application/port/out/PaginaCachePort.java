package com.wmakeouthill.portfolio.application.port.out;

import com.wmakeouthill.portfolio.application.cache.PaginaCacheada;

import java.util.Optional;

/**
 * Cache em memória das páginas públicas renderizadas (HTML do SSR).
 *
 * Mantém o contrato independente da tecnologia: hoje Caffeine (instância única);
 * se o deploy escalar para múltiplos containers, troca-se por Redis sem alterar
 * os use cases.
 */
public interface PaginaCachePort {

  Optional<PaginaCacheada> buscar(String chave);

  void armazenar(String chave, PaginaCacheada pagina);

  void invalidar(String chave);

  /** Invalida todas as chaves associadas a uma tag (ex.: {@code project:aa-space}). */
  void invalidarPorTag(String tag);

  void limparTudo();

  long quantidade();

  /**
   * Single-flight: tenta adquirir o lock da chave dentro do tempo de espera.
   * Quem obtém o lock gera a página; os demais aguardam e devem servir stale.
   *
   * @return {@code true} se obteve o lock (responsável por renderizar).
   */
  boolean tentarObterLock(String chave, int esperaSegundos);

  /** Libera o lock previamente obtido para a chave. Idempotente. */
  void liberarLock(String chave);
}
