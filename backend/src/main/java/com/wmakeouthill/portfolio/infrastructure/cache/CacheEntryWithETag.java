package com.wmakeouthill.portfolio.infrastructure.cache;

import java.time.Instant;
import java.util.Optional;

/**
 * Entrada de cache genérica com suporte a ETag e TTL.
 * Permite validação condicional para economizar bandwidth.
 *
 * @param <T> tipo do valor armazenado
 */
public class CacheEntryWithETag<T> {

    private final T value;
    private final Instant createdAt;
    private final long ttlMs;
    private final String etag;

    public CacheEntryWithETag(T value, long ttlMs, String etag) {
        this.value = value;
        this.createdAt = Instant.now();
        this.ttlMs = ttlMs;
        this.etag = etag;
    }

    public CacheEntryWithETag(T value, long ttlMs) {
        this(value, ttlMs, null);
    }

    /**
     * Verifica se o cache expirou.
     */
    public boolean isExpired() {
        return Instant.now().isAfter(createdAt.plusMillis(ttlMs));
    }

    /**
     * Retorna idade do cache em milissegundos.
     */
    public long getAgeMs() {
        return Instant.now().toEpochMilli() - createdAt.toEpochMilli();
    }

    /**
     * Retorna idade do cache em segundos.
     */
    public long getAgeSeconds() {
        return getAgeMs() / 1000;
    }

    public T getValue() {
        return value;
    }

    public Optional<String> getEtag() {
        return Optional.ofNullable(etag);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public long getTtlMs() {
        return ttlMs;
    }

    /**
     * Verifica se tem ETag para revalidação condicional.
     */
    public boolean hasEtag() {
        return etag != null && !etag.isBlank();
    }
}
