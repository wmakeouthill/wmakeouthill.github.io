package com.wmakeouthill.portfolio.infrastructure.pdf;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cache em memória para thumbnails de PDFs.
 * Evita regenerar thumbnails a cada requisição.
 */
@Slf4j
@Service
public class ThumbnailCacheService {

    /** Cache de thumbnails: fileName -> bytes da imagem PNG */
    private final Map<String, byte[]> thumbnailCache = new ConcurrentHashMap<>();

    /** Cache de PDFs baixados: fileName -> bytes do PDF */
    private final Map<String, byte[]> pdfCache = new ConcurrentHashMap<>();

    /**
     * Obtém thumbnail do cache.
     */
    public Optional<byte[]> getThumbnail(String fileName) {
        byte[] cached = thumbnailCache.get(normalizeKey(fileName));
        if (cached != null) {
            log.debug("Thumbnail cache HIT: {}", fileName);
            return Optional.of(cached);
        }
        log.debug("Thumbnail cache MISS: {}", fileName);
        return Optional.empty();
    }

    /**
     * Armazena thumbnail no cache.
     */
    public void putThumbnail(String fileName, byte[] thumbnailBytes) {
        if (thumbnailBytes != null && thumbnailBytes.length > 0) {
            thumbnailCache.put(normalizeKey(fileName), thumbnailBytes);
            log.debug("Thumbnail cached: {} ({} bytes)", fileName, thumbnailBytes.length);
        }
    }

    /**
     * Obtém PDF do cache.
     */
    public Optional<byte[]> getPdf(String fileName) {
        byte[] cached = pdfCache.get(normalizeKey(fileName));
        if (cached != null) {
            log.debug("PDF cache HIT: {}", fileName);
            return Optional.of(cached);
        }
        log.debug("PDF cache MISS: {}", fileName);
        return Optional.empty();
    }

    /**
     * Armazena PDF no cache.
     */
    public void putPdf(String fileName, byte[] pdfBytes) {
        if (pdfBytes != null && pdfBytes.length > 0) {
            pdfCache.put(normalizeKey(fileName), pdfBytes);
            log.debug("PDF cached: {} ({} bytes)", fileName, pdfBytes.length);
        }
    }

    /**
     * Verifica se thumbnail está no cache.
     */
    public boolean hasThumbnail(String fileName) {
        return thumbnailCache.containsKey(normalizeKey(fileName));
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
        return new CacheStats(thumbnailCache.size(), pdfCache.size());
    }

    private String normalizeKey(String fileName) {
        return fileName.toLowerCase().trim();
    }

    public record CacheStats(int thumbnailCount, int pdfCount) {}
}

