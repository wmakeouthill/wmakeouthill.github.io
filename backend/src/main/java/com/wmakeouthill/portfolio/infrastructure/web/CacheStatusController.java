package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.CacheStatusDto;
import com.wmakeouthill.portfolio.application.dto.CacheStatusDto.CacheInfo;
import com.wmakeouthill.portfolio.application.dto.CacheStatusDto.GithubApiInfo;
import com.wmakeouthill.portfolio.domain.service.ProjetoKeywordDetector;
import com.wmakeouthill.portfolio.infrastructure.github.GithubContentCache;
import com.wmakeouthill.portfolio.infrastructure.pdf.ThumbnailCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller para verificar status do cache.
 * Permite verificar sincronização com baixo custo de API.
 */
@Slf4j
@RestController
@RequestMapping("/api/cache")
@RequiredArgsConstructor
public class CacheStatusController {

    private final GithubContentCache githubContentCache;
    private final ThumbnailCacheService thumbnailCacheService;
    private final ProjetoKeywordDetector projetoKeywordDetector;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${github.api.token:}")
    private String githubToken;

    /**
     * Retorna status atual dos caches.
     * Custo baixo: não faz requisições pesadas ao GitHub.
     */
    @GetMapping("/status")
    public ResponseEntity<CacheStatusDto> getStatus() {
        Map<String, CacheInfo> caches = new HashMap<>();

        // GitHub Content Cache
        Instant githubLastUpdate = githubContentCache.getLastUpdate("list:portifolio_imgs")
                .orElse(null);
        caches.put("githubContent", new CacheInfo(
                githubContentCache.size(),
                githubContentCache.getTtlMinutes(),
                githubLastUpdate));

        // Thumbnail Cache
        var thumbStats = thumbnailCacheService.getStats();
        caches.put("thumbnails", new CacheInfo(
                thumbStats.thumbnailCount() + thumbStats.pdfCount(),
                thumbStats.ttlMinutes(),
                null // Thumbnail cache não rastreia último update global
        ));

        // Projeto Keywords Cache
        int projetosCount = projetoKeywordDetector.obterTodosProjetos().size();
        caches.put("keywords", new CacheInfo(
                projetosCount,
                24 * 60, // TTL do ProjetoKeywordDetector: 24 horas
                null));

        // GitHub API Rate Limit (requisição leve)
        GithubApiInfo githubApi = fetchGithubRateLimit();

        // Considera sincronizado se há dados em cache
        boolean synced = githubContentCache.size() > 0 && projetosCount > 0;
        Instant lastSync = githubLastUpdate;

        CacheStatusDto status = synced
                ? CacheStatusDto.synced(lastSync, caches, githubApi)
                : CacheStatusDto.notSynced(caches, githubApi);

        return ResponseEntity.ok(status);
    }

    /**
     * Força invalidação de todo o cache.
     * Próxima requisição vai buscar dados frescos do GitHub.
     */
    @PostMapping("/invalidate")
    public ResponseEntity<Map<String, String>> invalidateAll() {
        githubContentCache.clear();
        thumbnailCacheService.clearAll();
        projetoKeywordDetector.recarregarProjetosDinamicos();

        log.info("Cache invalidado manualmente via API");
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Cache invalidado. Próxima requisição buscará dados frescos."));
    }

    /**
     * Busca rate limit do GitHub API (requisição muito leve).
     */
    private GithubApiInfo fetchGithubRateLimit() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.github.com/rate_limit"))
                    .timeout(Duration.ofSeconds(5))
                    .headers(buildHeaders())
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return parseRateLimit(response.body());
            }
        } catch (IOException | InterruptedException e) {
            log.warn("Erro ao buscar rate limit do GitHub: {}", e.getMessage());
            Thread.currentThread().interrupt();
        }
        return new GithubApiInfo(0, 0, null);
    }

    private String[] buildHeaders() {
        var headers = new java.util.ArrayList<>(List.of(
                "Accept", "application/vnd.github+json",
                "X-GitHub-Api-Version", "2022-11-28"));

        String token = resolveToken();
        if (!token.isBlank()) {
            headers.add("Authorization");
            headers.add("Bearer " + token);
        }
        return headers.toArray(String[]::new);
    }

    private String resolveToken() {
        if (githubToken != null && !githubToken.isBlank()) {
            return githubToken;
        }
        for (String envVar : List.of("GITHUB_API_TOKEN", "GITHUB_TOKEN", "GH_TOKEN")) {
            String token = System.getenv(envVar);
            if (token != null && !token.isBlank()) {
                return token;
            }
        }
        return "";
    }

    private GithubApiInfo parseRateLimit(String body) {
        try {
            // Parse simples usando indexOf (evita dependência de ObjectMapper aqui)
            int limitStart = body.indexOf("\"limit\":") + 8;
            int limitEnd = body.indexOf(",", limitStart);
            int limit = Integer.parseInt(body.substring(limitStart, limitEnd).trim());

            int remainingStart = body.indexOf("\"remaining\":") + 12;
            int remainingEnd = body.indexOf(",", remainingStart);
            int remaining = Integer.parseInt(body.substring(remainingStart, remainingEnd).trim());

            int resetStart = body.indexOf("\"reset\":") + 8;
            int resetEnd = body.indexOf(",", resetStart);
            if (resetEnd == -1)
                resetEnd = body.indexOf("}", resetStart);
            long resetEpoch = Long.parseLong(body.substring(resetStart, resetEnd).trim());
            Instant resetsAt = Instant.ofEpochSecond(resetEpoch);

            return new GithubApiInfo(limit, remaining, resetsAt);
        } catch (Exception e) {
            log.warn("Erro ao parsear rate limit: {}", e.getMessage());
            return new GithubApiInfo(0, 0, null);
        }
    }
}
