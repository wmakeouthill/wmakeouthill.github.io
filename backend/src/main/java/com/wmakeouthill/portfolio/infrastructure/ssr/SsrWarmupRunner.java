package com.wmakeouthill.portfolio.infrastructure.ssr;

import com.wmakeouthill.portfolio.application.seo.GerarSitemapUseCase;
import com.wmakeouthill.portfolio.application.usecase.RenderizarPaginaPublicaUseCase;
import com.wmakeouthill.portfolio.infrastructure.config.SsrProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

/**
 * Pré-aquece o cache de páginas SSR no startup: renderiza as rotas públicas
 * (home, lista e top-N projetos) em pt e /en, de modo que o primeiro visitante
 * — incluindo o Googlebot — já receba HTML do cache (HIT) sem pagar o render.
 *
 * <p>Roda em background após {@code ApplicationReadyEvent} e só quando
 * {@code ssr.enabled=true} e {@code ssr.cache.warmup.enabled=true}.</p>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "ssr.enabled", havingValue = "true")
public class SsrWarmupRunner {

  private final GerarSitemapUseCase gerarSitemapUseCase;
  private final RenderizarPaginaPublicaUseCase renderizarPaginaPublicaUseCase;
  private final SsrProperties ssrProperties;
  private final Executor revalidacaoExecutor;

  public SsrWarmupRunner(
      GerarSitemapUseCase gerarSitemapUseCase,
      RenderizarPaginaPublicaUseCase renderizarPaginaPublicaUseCase,
      SsrProperties ssrProperties,
      @Qualifier(SsrConfig.EXECUTOR_REVALIDACAO) Executor revalidacaoExecutor) {
    this.gerarSitemapUseCase = gerarSitemapUseCase;
    this.renderizarPaginaPublicaUseCase = renderizarPaginaPublicaUseCase;
    this.ssrProperties = ssrProperties;
    this.revalidacaoExecutor = revalidacaoExecutor;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void aquecer() {
    if (!ssrProperties.cache().warmup().enabled()) {
      log.info("Warmup SSR desativado (ssr.cache.warmup.enabled=false)");
      return;
    }
    revalidacaoExecutor.execute(this::executarAquecimento);
  }

  private void executarAquecimento() {
    List<String> rotas = montarRotas();
    log.info("Iniciando warmup SSR de {} rotas (pt + en)...", rotas.size());
    long inicio = System.currentTimeMillis();
    int ok = 0;
    for (String caminho : rotas) {
      if (aquecerRota(caminho)) {
        ok++;
      }
    }
    log.info("Warmup SSR concluido: {}/{} rotas em {} ms",
        ok, rotas.size(), System.currentTimeMillis() - inicio);
  }

  private boolean aquecerRota(String caminho) {
    try {
      String idioma = caminho.startsWith("/en") ? "en" : "pt";
      renderizarPaginaPublicaUseCase.executar(caminho, idioma);
      return true;
    } catch (RuntimeException e) {
      log.warn("Warmup falhou para {}: {}", caminho, e.getMessage());
      return false;
    }
  }

  /** Rotas públicas (limitadas a top-projects) em pt e suas equivalentes /en. */
  private List<String> montarRotas() {
    int limite = ssrProperties.cache().warmup().topProjects();
    List<String> base = gerarSitemapUseCase.rotasPublicas();
    List<String> rotas = new ArrayList<>();
    int projetos = 0;
    for (String caminho : base) {
      boolean ehProjeto = caminho.startsWith("/projects/");
      if (ehProjeto && projetos++ >= limite) {
        continue;
      }
      rotas.add(caminho);
      rotas.add(versaoEn(caminho));
    }
    return rotas;
  }

  private String versaoEn(String caminho) {
    return "/".equals(caminho) ? "/en" : "/en" + caminho;
  }
}
