package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.seo.GerarSitemapUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

/**
 * Expõe {@code /sitemap.xml} e {@code /robots.txt} (gerados e cacheados).
 * Rotas explícitas têm precedência sobre o fallback {@code /**} do SpaController.
 */
@RestController
@RequiredArgsConstructor
public class SitemapController {

  private final GerarSitemapUseCase gerarSitemapUseCase;

  @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
  public ResponseEntity<String> sitemap() {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_XML)
        .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
        .body(gerarSitemapUseCase.gerarSitemap());
  }

  @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
  public ResponseEntity<String> robots() {
    return ResponseEntity.ok()
        .contentType(MediaType.TEXT_PLAIN)
        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
        .body(gerarSitemapUseCase.gerarRobots());
  }
}
