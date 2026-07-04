package com.wmakeouthill.portfolio.infrastructure.warmup;

import com.wmakeouthill.portfolio.application.seo.GerarSitemapUseCase;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Mantém o edge cache da Vercel (e, por tabela, a função SSR e este próprio
 * backend) sempre aquecidos.
 *
 * <p>O frontend roda como funções serverless na Vercel. Quando a cópia de uma
 * rota expira do edge cache, o próximo acesso paga o render frio completo
 * (cold start da função SSR + cadeia de proxies + backend), que medimos em
 * ~9&nbsp;s. Como o HTML SSR é servido com {@code stale-while-revalidate}, basta
 * existir <em>alguma</em> cópia no edge para o usuário receber resposta
 * instantânea (STALE/HIT) enquanto a revalidação roda em background.</p>
 *
 * <p>Este backend está ligado 24/7 na Oracle, então ele é o lugar natural para
 * gerar esse tráfego periódico. A cada {@code edge.warmup.interval-ms} ele faz
 * um GET em cada rota pública. Por padrão usa o sitemap ({@link
 * GerarSitemapUseCase#rotasPublicas()}), cobrindo <strong>todas</strong> as
 * páginas de projeto (pt + /en) — exatamente as rotas que o Googlebot rastreia.</p>
 *
 * <p>Ativável por {@code edge.warmup.enabled} (default true). Em dev local,
 * defina {@code EDGE_WARMUP_ENABLED=false} para não pingar produção.</p>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "edge.warmup.enabled", havingValue = "true", matchIfMissing = true)
public class EdgeCacheWarmupScheduler {

  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(10))
      .followRedirects(HttpClient.Redirect.NORMAL)
      .build();

  private final GerarSitemapUseCase gerarSitemapUseCase;

  @Value("${public.site.base-url:https://wmakeouthill.dev}")
  private String baseUrl;

  @Value("${edge.warmup.use-sitemap:true}")
  private boolean useSitemap;

  @Value("${edge.warmup.routes:/,/en,/projects,/en/projects}")
  private String routesCsv;

  public EdgeCacheWarmupScheduler(GerarSitemapUseCase gerarSitemapUseCase) {
    this.gerarSitemapUseCase = gerarSitemapUseCase;
  }

  @PostConstruct
  void logConfig() {
    log.info("🔥 Edge warmup ativo: base={} useSitemap={}", trimTrailingSlash(baseUrl), useSitemap);
  }

  /**
   * Resolve as rotas a aquecer. Com {@code use-sitemap=true}, deriva do sitemap
   * (home + lista + todas as páginas de projeto), duplicando em /en. Em caso de
   * falha/vazio, cai na lista estática {@code edge.warmup.routes}.
   */
  private List<String> rotas() {
    if (useSitemap) {
      try {
        Set<String> rotas = new LinkedHashSet<>();
        for (String caminho : gerarSitemapUseCase.rotasPublicas()) {
          rotas.add(caminho);
          rotas.add(versaoEn(caminho));
        }
        if (!rotas.isEmpty()) {
          return new ArrayList<>(rotas);
        }
        log.warn("Edge warmup: sitemap vazio, usando lista estatica");
      } catch (RuntimeException e) {
        log.warn("Edge warmup: falha ao ler sitemap ({}), usando lista estatica", e.getMessage());
      }
    }
    return rotasEstaticas();
  }

  private List<String> rotasEstaticas() {
    return Arrays.stream(routesCsv.split(","))
        .map(String::trim)
        .filter(r -> !r.isBlank())
        .toList();
  }

  private String versaoEn(String caminho) {
    return "/".equals(caminho) ? "/en" : "/en" + caminho;
  }

  /**
   * Pinga as rotas públicas em intervalo fixo. {@code initialDelay} evita
   * concorrer com o startup pesado (warmup de thumbnails, etc.). {@code
   * fixedDelay} mede a partir do fim da execução anterior, então ciclos não se
   * sobrepõem mesmo quando há muitas rotas.
   */
  @Scheduled(
      initialDelayString = "${edge.warmup.initial-delay-ms:60000}",
      fixedDelayString = "${edge.warmup.interval-ms:300000}")
  public void aquecerEdge() {
    String base = trimTrailingSlash(baseUrl);
    List<String> rotas = new ArrayList<>(rotas());
    // Aquece o JSON de cases nos dois idiomas (alimenta a vitrine da aba Profissionais)
    rotas.add("/api/content/cases?lang=pt");
    rotas.add("/api/content/cases?lang=en");
    long inicio = System.currentTimeMillis();
    int ok = 0;
    for (String rota : rotas) {
      if (aquecerRota(base + rota)) {
        ok++;
      }
    }
    log.debug("Edge warmup: {}/{} rotas OK em {} ms", ok, rotas.size(),
        System.currentTimeMillis() - inicio);
  }

  private boolean aquecerRota(String url) {
    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(REQUEST_TIMEOUT)
          .header("User-Agent", "PortfolioEdgeWarmer/1.0 (+backend-oracle)")
          .GET()
          .build();
      HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
      boolean sucesso = response.statusCode() >= 200 && response.statusCode() < 400;
      if (!sucesso) {
        log.warn("Edge warmup {} respondeu status {}", url, response.statusCode());
      }
      return sucesso;
    } catch (java.io.IOException e) {
      log.warn("Edge warmup falhou para {}: {}", url, e.getMessage());
      return false;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("Edge warmup interrompido para {}", url);
      return false;
    }
  }

  private String trimTrailingSlash(String value) {
    return value.replaceAll("/+$", "");
  }
}
