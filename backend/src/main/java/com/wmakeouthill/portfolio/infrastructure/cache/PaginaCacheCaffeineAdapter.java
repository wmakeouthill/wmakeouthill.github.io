package com.wmakeouthill.portfolio.infrastructure.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.wmakeouthill.portfolio.application.cache.PaginaCacheada;
import com.wmakeouthill.portfolio.application.port.out.PaginaCachePort;
import com.wmakeouthill.portfolio.infrastructure.config.SsrProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Cache de páginas SSR em Caffeine, com:
 * <ul>
 * <li>expiração física na janela <em>stale</em> (freshness lógica via metadados da entrada);</li>
 * <li>índice de tags para invalidação em lote (ex.: {@code project:aa-space});</li>
 * <li>locks por chave para single-flight (evita N renders simultâneos da mesma rota).</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaginaCacheCaffeineAdapter implements PaginaCachePort {

  private final SsrProperties ssrProperties;

  private Cache<String, PaginaCacheada> cache;
  private final ConcurrentHashMap<String, Set<String>> chavesPorTag = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, ReentrantLock> locksPorChave = new ConcurrentHashMap<>();

  @PostConstruct
  void inicializar() {
    SsrProperties.Html html = ssrProperties.cache().html();
    this.cache = Caffeine.newBuilder()
        .maximumSize(html.maxEntries())
        .expireAfterWrite(Duration.ofSeconds(html.staleSeconds()))
        .recordStats()
        .build();
    log.info("Cache de paginas SSR inicializado (maxEntries={}, staleSeconds={})",
        html.maxEntries(), html.staleSeconds());
  }

  @Override
  public Optional<PaginaCacheada> buscar(String chave) {
    return Optional.ofNullable(cache.getIfPresent(chave));
  }

  @Override
  public void armazenar(String chave, PaginaCacheada pagina) {
    cache.put(chave, pagina);
    for (String tag : pagina.tags()) {
      chavesPorTag.computeIfAbsent(tag, t -> ConcurrentHashMap.newKeySet()).add(chave);
    }
    log.debug("Pagina cacheada: {} (tags={})", chave, pagina.tags());
  }

  @Override
  public void invalidar(String chave) {
    cache.invalidate(chave);
    chavesPorTag.values().forEach(chaves -> chaves.remove(chave));
    log.debug("Pagina invalidada: {}", chave);
  }

  @Override
  public void invalidarPorTag(String tag) {
    Set<String> chaves = chavesPorTag.remove(tag);
    if (chaves == null || chaves.isEmpty()) {
      return;
    }
    cache.invalidateAll(chaves);
    log.info("Invalidadas {} paginas pela tag '{}'", chaves.size(), tag);
  }

  @Override
  public void limparTudo() {
    cache.invalidateAll();
    chavesPorTag.clear();
    log.info("Cache de paginas SSR limpo completamente");
  }

  @Override
  public long quantidade() {
    return cache.estimatedSize();
  }

  @Override
  public boolean tentarObterLock(String chave, int esperaSegundos) {
    ReentrantLock lock = locksPorChave.computeIfAbsent(chave, k -> new ReentrantLock());
    try {
      return lock.tryLock(Math.max(0, esperaSegundos), TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return false;
    }
  }

  @Override
  public void liberarLock(String chave) {
    ReentrantLock lock = locksPorChave.get(chave);
    if (lock != null && lock.isHeldByCurrentThread()) {
      lock.unlock();
    }
  }
}
