package com.wmakeouthill.portfolio.infrastructure.github;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cache em memória para conteúdo do GitHub.
 * TTL de 10 minutos, suporte a ETag para conditional requests, thread-safe.
 */
@Slf4j
@Component
public class GithubContentCache {

  private static final long DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

  private final ConcurrentHashMap<String, CacheEntry<?>> cache = new ConcurrentHashMap<>();

  /**
   * Obtém lista de arquivos do cache.
   */
  @SuppressWarnings("unchecked")
  public Optional<List<RepositoryFileDto>> getFileList(String key) {
    CacheEntry<?> entry = cache.get(key);
    if (entry != null && !entry.isExpired()) {
      log.debug("Cache hit: {}", key);
      return Optional.of((List<RepositoryFileDto>) entry.getValue());
    }
    return Optional.empty();
  }

  /**
   * Obtém ETag de uma entrada do cache (para conditional requests).
   */
  public Optional<String> getETag(String key) {
    CacheEntry<?> entry = cache.get(key);
    if (entry != null) {
      return entry.getEtag();
    }
    return Optional.empty();
  }

  /**
   * Armazena lista de arquivos no cache.
   */
  public void putFileList(String key, List<RepositoryFileDto> files) {
    cache.put(key, new CacheEntry<>(files, DEFAULT_TTL_MS, null));
    log.debug("Cache put: {} ({} itens)", key, files.size());
  }

  /**
   * Armazena lista de arquivos no cache com ETag.
   */
  public void putFileListWithETag(String key, List<RepositoryFileDto> files, String etag) {
    cache.put(key, new CacheEntry<>(files, DEFAULT_TTL_MS, etag));
    log.debug("Cache put com ETag: {} ({} itens, etag={})", key, files.size(),
        etag != null ? etag.substring(0, Math.min(10, etag.length())) + "..." : "null");
  }

  /**
   * Atualiza timestamp de uma entrada existente (quando ETag valida que não
   * mudou).
   */

  public void refreshTtl(String key) {
    CacheEntry<?> entry = cache.get(key);
    if (entry != null) {
      cache.put(key, new CacheEntry<>(entry.getValue(), DEFAULT_TTL_MS, entry.etag));
      log.debug("Cache TTL refreshed: {}", key);
    }
  }

  /**
   * Invalida uma entrada específica.
   */
  public void invalidate(String key) {
    cache.remove(key);
    log.debug("Cache invalidado: {}", key);
  }

  /**
   * Limpa todo o cache.
   */
  public void clear() {
    cache.clear();
    log.info("Cache limpo completamente");
  }

  /**
   * Retorna número de entradas no cache.
   */
  public int size() {
    return cache.size();
  }

  /**
   * Retorna o TTL padrão em minutos.
   */
  public long getTtlMinutes() {
    return DEFAULT_TTL_MS / 60 / 1000;
  }

  /**
   * Retorna timestamp da última atualização de uma entrada.
   */
  public Optional<Instant> getLastUpdate(String key) {
    CacheEntry<?> entry = cache.get(key);
    if (entry != null) {
      return Optional.of(entry.getCreatedAt());
    }
    return Optional.empty();
  }

  private static class CacheEntry<T> {
    private final T value;
    private final long expiresAt;
    private final Instant createdAt;
    private final String etag;

    CacheEntry(T value, long ttlMs, String etag) {
      this.value = value;
      this.createdAt = Instant.now();
      this.expiresAt = System.currentTimeMillis() + ttlMs;
      this.etag = etag;
    }

    boolean isExpired() {
      return System.currentTimeMillis() > expiresAt;
    }

    T getValue() {
      return value;
    }

    Optional<String> getEtag() {
      return Optional.ofNullable(etag);
    }

    Instant getCreatedAt() {
      return createdAt;
    }
  }
}
