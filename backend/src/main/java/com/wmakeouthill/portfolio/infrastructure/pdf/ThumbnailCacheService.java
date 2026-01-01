package com.wmakeouthill.portfolio.infrastructure.pdf;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cache em memória para thumbnails de PDFs.
 * TTL de 30 minutos para evitar regenerar thumbnails frequentemente.
 */
@Slf4j
@Service
public class ThumbnailCacheService {

    private static final long THUMBNAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
    private static final long PDF_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

    /** Cache de thumbnails: fileName -> CacheEntry com bytes da imagem PNG */
    private final Map<String, CacheEntry> thumbnailCache = new ConcurrentHashMap<>();

    /** Cache de PDFs baixados: fileName -> CacheEntry com bytes do PDF */
    private final Map<String, CacheEntry> pdfCache = new ConcurrentHashMap<>();

    /**
     * Obtém thumbnail do cache (se não expirou).
     */
    public Optional<byte[]> getThumbnail(String fileName) {
        CacheEntry cached = thumbnailCache.get(normalizeKey(fileName));
        if (cached != null && !cached.isExpired()) {
            log.debug("Thumbnail cache HIT: {}", fileName);
            return Optional.of(cached.data());
        }
        if (cached != null) {
            thumbnailCache.remove(normalizeKey(fileName));
            log.debug("Thumbnail cache EXPIRED: {}", fileName);
        }
        log.debug("Thumbnail cache MISS: {}", fileName);
        return Optional.empty();
    }

    /**
     * Armazena thumbnail no cache.
     */
    public void putThumbnail(String fileName, byte[] thumbnailBytes) {
        if (thumbnailBytes != null && thumbnailBytes.length > 0) {
            thumbnailCache.put(normalizeKey(fileName), new CacheEntry(thumbnailBytes, THUMBNAIL_TTL_MS));
            log.debug("Thumbnail cached: {} ({} bytes)", fileName, thumbnailBytes.length);
        }
    }

    /**
     * Obtém PDF do cache (se não expirou).
     */
    public Optional<byte[]> getPdf(String fileName) {
        CacheEntry cached = pdfCache.get(normalizeKey(fileName));
        if (cached != null && !cached.isExpired()) {
            log.debug("PDF cache HIT: {}", fileName);
            return Optional.of(cached.data());
        }
        if (cached != null) {
            pdfCache.remove(normalizeKey(fileName));
            log.debug("PDF cache EXPIRED: {}", fileName);
        }
        log.debug("PDF cache MISS: {}", fileName);
        return Optional.empty();
    }

    /**
     * Armazena PDF no cache.
     */
    public void putPdf(String fileName, byte[] pdfBytes) {
        if (pdfBytes != null && pdfBytes.length > 0) {
            pdfCache.put(normalizeKey(fileName), new CacheEntry(pdfBytes, PDF_TTL_MS));
            log.debug("PDF cached: {} ({} bytes)", fileName, pdfBytes.length);
        }
    }

    /**
     * Verifica se thumbnail está no cache (válido).
     */
    public boolean hasThumbnail(String fileName) {
        CacheEntry cached = thumbnailCache.get(normalizeKey(fileName));
        return cached != null && !cached.isExpired();
    }

    /**
     * Limpa todo o cache.
     */
    public void clearAll() {
        thumbnailCache.clear();
        pdfCache.clear();
        log.info("Cache de thumbnails e PDFs limpo");
    }

    /**
     * Retorna estatísticas do cache.
     */
    public CacheStats getStats() {
        // Conta apenas entradas válidas
        long validThumbnails = thumbnailCache.values().stream().filter(e -> !e.isExpired()).count();
        long validPdfs = pdfCache.values().stream().filter(e -> !e.isExpired()).count();
        return new CacheStats((int) validThumbnails, (int) validPdfs, THUMBNAIL_TTL_MS / 60 / 1000);
    }

    private String normalizeKey(String fileName) {
        return fileName.toLowerCase().trim();
    }

    /**
     * Entrada de cache com TTL.
     */
    private record CacheEntry(byte[] data, long expiresAt, Instant createdAt) {
        CacheEntry(byte[] data, long ttlMs) {
            this(data, System.currentTimeMillis() + ttlMs, Instant.now());
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    public record CacheStats(int thumbnailCount, int pdfCount, long ttlMinutes) {
    }
}
