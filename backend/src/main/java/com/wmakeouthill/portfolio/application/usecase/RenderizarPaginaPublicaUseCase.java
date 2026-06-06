package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.cache.PaginaCacheada;
import com.wmakeouthill.portfolio.application.cache.RespostaPaginaPublica;
import com.wmakeouthill.portfolio.application.cache.ResultadoRenderizacao;
import com.wmakeouthill.portfolio.application.cache.StatusCache;
import com.wmakeouthill.portfolio.application.port.out.PaginaCachePort;
import com.wmakeouthill.portfolio.application.port.out.SsrRendererPort;
import com.wmakeouthill.portfolio.infrastructure.config.SsrProperties;
import com.wmakeouthill.portfolio.infrastructure.ssr.SsrConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Executor;

/**
 * Orquestra o edge SSR: serve a página pública do cache em memória quando
 * fresca (HIT), serve expirada dentro da janela stale enquanto revalida em
 * background (STALE), ou renderiza no Node sob single-flight em cache-miss
 * (MISS). A flag {@code ssr.bypass} ignora o cache (rollback seguro).
 */
@Slf4j
@Service
public class RenderizarPaginaPublicaUseCase {

  private final SsrProperties ssrProperties;
  private final PaginaCachePort paginaCachePort;
  private final SsrRendererPort ssrRendererPort;
  private final Executor revalidacaoExecutor;

  public RenderizarPaginaPublicaUseCase(
      SsrProperties ssrProperties,
      PaginaCachePort paginaCachePort,
      SsrRendererPort ssrRendererPort,
      @Qualifier(SsrConfig.EXECUTOR_REVALIDACAO) Executor revalidacaoExecutor) {
    this.ssrProperties = ssrProperties;
    this.paginaCachePort = paginaCachePort;
    this.ssrRendererPort = ssrRendererPort;
    this.revalidacaoExecutor = revalidacaoExecutor;
  }

  public RespostaPaginaPublica executar(String caminho, String idioma) {
    if (ssrProperties.bypass()) {
      return renderizarSemCache(caminho, idioma);
    }

    String chave = montarChave(caminho, idioma);
    Optional<PaginaCacheada> emCache = paginaCachePort.buscar(chave);
    Instant agora = Instant.now();

    if (emCache.isPresent()) {
      PaginaCacheada pagina = emCache.get();
      if (pagina.estaFresca(agora)) {
        return resposta(pagina, StatusCache.HIT);
      }
      if (pagina.podeServirStale(agora)) {
        agendarRevalidacao(chave, caminho, idioma);
        return resposta(pagina, StatusCache.STALE);
      }
    }
    return renderizarComLock(chave, caminho, idioma, emCache);
  }

  /** Renderiza sob single-flight: só um thread gera; os demais servem stale ou inline. */
  private RespostaPaginaPublica renderizarComLock(
      String chave, String caminho, String idioma, Optional<PaginaCacheada> emCache) {
    boolean obteveLock = paginaCachePort.tentarObterLock(chave, ssrProperties.cache().lockWaitSeconds());
    if (!obteveLock) {
      return emCache.map(p -> resposta(p, StatusCache.STALE))
          .orElseGet(() -> renderizarSemCache(caminho, idioma));
    }
    try {
      Optional<PaginaCacheada> recheck = paginaCachePort.buscar(chave);
      if (recheck.isPresent() && recheck.get().estaFresca(Instant.now())) {
        return resposta(recheck.get(), StatusCache.HIT);
      }
      return renderizarEArmazenar(chave, caminho, idioma);
    } finally {
      paginaCachePort.liberarLock(chave);
    }
  }

  private void agendarRevalidacao(String chave, String caminho, String idioma) {
    revalidacaoExecutor.execute(() -> {
      if (!paginaCachePort.tentarObterLock(chave, 0)) {
        return;
      }
      try {
        renderizarEArmazenar(chave, caminho, idioma);
      } catch (RuntimeException e) {
        log.warn("Falha na revalidacao em background de {}: {}", chave, e.getMessage());
      } finally {
        paginaCachePort.liberarLock(chave);
      }
    });
  }

  private RespostaPaginaPublica renderizarEArmazenar(String chave, String caminho, String idioma) {
    long inicio = System.currentTimeMillis();
    ResultadoRenderizacao resultado = ssrRendererPort.renderizar(caminho, idioma);
    long tempo = System.currentTimeMillis() - inicio;
    if (!resultado.cacheavel()) {
      return new RespostaPaginaPublica(resultado.html(), resultado.status(), null, StatusCache.MISS);
    }
    PaginaCacheada pagina = construir(resultado, caminho, tempo);
    paginaCachePort.armazenar(chave, pagina);
    log.debug("Pagina renderizada e cacheada: {} ({} ms)", chave, tempo);
    return resposta(pagina, StatusCache.MISS);
  }

  private RespostaPaginaPublica renderizarSemCache(String caminho, String idioma) {
    ResultadoRenderizacao resultado = ssrRendererPort.renderizar(caminho, idioma);
    String etag = resultado.cacheavel() ? gerarEtag(resultado.html()) : null;
    StatusCache status = ssrProperties.bypass() ? StatusCache.BYPASS : StatusCache.MISS;
    return new RespostaPaginaPublica(resultado.html(), resultado.status(), etag, status);
  }

  private PaginaCacheada construir(ResultadoRenderizacao resultado, String caminho, long tempoMs) {
    SsrProperties.Html html = ssrProperties.cache().html();
    return PaginaCacheada.criar(
        resultado.html(), resultado.status(), gerarEtag(resultado.html()),
        html.ttlSeconds(), html.staleSeconds(), tagsDe(caminho), tempoMs);
  }

  private RespostaPaginaPublica resposta(PaginaCacheada pagina, StatusCache status) {
    return new RespostaPaginaPublica(pagina.html(), pagina.status(), pagina.etag(), status);
  }

  private String montarChave(String caminho, String idioma) {
    return idioma + "|" + caminho;
  }

  private Set<String> tagsDe(String caminho) {
    String semIdioma = caminho.startsWith("/en") ? caminho.substring(3) : caminho;
    if (semIdioma.isBlank()) {
      semIdioma = "/";
    }
    if (semIdioma.startsWith("/projects/")) {
      String slug = semIdioma.substring("/projects/".length()).toLowerCase();
      if (!slug.isBlank()) {
        return Set.of("project:" + slug);
      }
    }
    if (semIdioma.startsWith("/projects")) {
      return Set.of("projects");
    }
    return Set.of("home");
  }

  private String gerarEtag(String html) {
    return "\"" + Integer.toHexString(html.hashCode()) + "-" + html.length() + "\"";
  }
}
