package com.wmakeouthill.portfolio.infrastructure.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

/**
 * Habilita o Spring Cache e expõe um {@link CacheManager} Caffeine para os
 * data caches simples (consumidos via {@code @Cacheable}):
 * {@code markdownHtml}, {@code mermaidSvg} e {@code githubData}.
 *
 * O cache de páginas SSR ({@code ssrPages}) NÃO fica aqui: ele exige
 * stale-while-revalidate e single-flight, implementados no
 * {@code PaginaCacheCaffeineAdapter}.
 */
@Configuration
@EnableCaching
@EnableConfigurationProperties({ SsrProperties.class, SiteProperties.class })
@RequiredArgsConstructor
public class CaffeineCacheConfig {

  public static final String CACHE_MARKDOWN = "markdownHtml";
  public static final String CACHE_MERMAID = "mermaidSvg";
  public static final String CACHE_GITHUB_DATA = "githubData";

  private final SsrProperties ssrProperties;

  @Bean
  public CacheManager cacheManager() {
    SsrProperties.Cache c = ssrProperties.cache();
    SimpleCacheManager manager = new SimpleCacheManager();
    manager.setCaches(List.of(
        construirCache(CACHE_MARKDOWN, c.markdown().maxEntries(), c.markdown().ttlSeconds()),
        construirCache(CACHE_MERMAID, c.mermaid().maxEntries(), c.mermaid().ttlSeconds()),
        construirCache(CACHE_GITHUB_DATA, c.data().maxEntries(), c.data().ttlSeconds())));
    return manager;
  }

  private CaffeineCache construirCache(String nome, int maxEntries, int ttlSegundos) {
    return new CaffeineCache(nome, Caffeine.newBuilder()
        .maximumSize(maxEntries)
        .expireAfterWrite(Duration.ofSeconds(ttlSegundos))
        .recordStats()
        .build());
  }
}
