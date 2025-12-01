package com.wmakeouthill.portfolio.infrastructure.github;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cache em memória para conteúdo do GitHub.
 * TTL configurável, thread-safe.
 */
@Slf4j
@Component
public class GithubContentCache {

  private static final long DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

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
   * Armazena lista de arquivos no cache.
   */
  public void putFileList(String key, List<RepositoryFileDto> files) {
    cache.put(key, new CacheEntry<>(files, DEFAULT_TTL_MS));
    log.debug("Cache put: {} ({} itens)", key, files.size());
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

  private static class CacheEntry<T> {
    private final T value;
    private final long expiresAt;

    CacheEntry(T value, long ttlMs) {
      this.value = value;
      this.expiresAt = System.currentTimeMillis() + ttlMs;
    }

    boolean isExpired() {
      return System.currentTimeMillis() > expiresAt;
    }

    T getValue() {
      return value;
    }
  }
}

