package com.wmakeouthill.portfolio.application.dto;

import java.time.Instant;
import java.util.Map;

/**
 * DTO para status do cache da aplicação.
 * Permite verificar se dados estão sincronizados com baixo custo.
 */
public record CacheStatusDto(
        boolean synced,
        Instant lastSync,
        Map<String, CacheInfo> caches,
        GithubApiInfo githubApi) {

    public record CacheInfo(
            int entries,
            long ttlMinutes,
            Instant lastUpdate) {
    }

    public record GithubApiInfo(
            int rateLimit,
            int remaining,
            Instant resetsAt) {
    }

    /**
     * Cria status indicando sincronizado.
     */
    public static CacheStatusDto synced(
            Instant lastSync,
            Map<String, CacheInfo> caches,
            GithubApiInfo githubApi) {
        return new CacheStatusDto(true, lastSync, caches, githubApi);
    }

    /**
     * Cria status indicando não sincronizado.
     */
    public static CacheStatusDto notSynced(
            Map<String, CacheInfo> caches,
            GithubApiInfo githubApi) {
        return new CacheStatusDto(false, null, caches, githubApi);
    }
}
