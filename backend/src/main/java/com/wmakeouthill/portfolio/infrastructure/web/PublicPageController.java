package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.cache.RespostaPaginaPublica;
import com.wmakeouthill.portfolio.application.usecase.RenderizarPaginaPublicaUseCase;
import com.wmakeouthill.portfolio.infrastructure.config.SsrProperties;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.concurrent.TimeUnit;

/**
 * Edge SSR: serve as páginas públicas renderizadas (home, lista e detalhe de
 * projetos, em pt e /en) a partir do cache em memória, caindo no renderer Node
 * apenas em cache-miss. Ativado por {@code ssr.enabled=true}; desligado, o
 * {@link SpaController} continua servindo a SPA estática (rollback sem deploy).
 *
 * <p>Só intercepta navegações ({@code Accept: text/html}); assets continuam indo
 * para o {@code SpaController} por não casarem com {@code produces=text/html}.</p>
 */
@Slf4j
@Controller
@RequiredArgsConstructor
@ConditionalOnProperty(name = "ssr.enabled", havingValue = "true")
public class PublicPageController {

  private final RenderizarPaginaPublicaUseCase renderizarPaginaPublicaUseCase;
  private final SsrProperties ssrProperties;

  @GetMapping(value = {
      "/", "/projects", "/projects/**",
      "/en", "/en/projects", "/en/projects/**"
  }, produces = MediaType.TEXT_HTML_VALUE)
  public ResponseEntity<String> servirPagina(HttpServletRequest request) {
    String caminho = request.getRequestURI();
    String idioma = caminho.startsWith("/en") ? "en" : "pt";

    RespostaPaginaPublica resposta = renderizarPaginaPublicaUseCase.executar(caminho, idioma);

    if (resposta.status() != 200 || resposta.html() == null) {
      return indisponivel(caminho, resposta.status());
    }
    if (naoModificado(request, resposta.etag())) {
      return naoModificadoResponse(resposta);
    }
    return ok(resposta);
  }

  private ResponseEntity<String> ok(RespostaPaginaPublica resposta) {
    HttpHeaders headers = montarHeaders(resposta);
    headers.setContentType(MediaType.valueOf("text/html;charset=UTF-8"));
    return new ResponseEntity<>(resposta.html(), headers, HttpStatus.OK);
  }

  private ResponseEntity<String> naoModificadoResponse(RespostaPaginaPublica resposta) {
    return new ResponseEntity<>(montarHeaders(resposta), HttpStatus.NOT_MODIFIED);
  }

  private HttpHeaders montarHeaders(RespostaPaginaPublica resposta) {
    SsrProperties.Html html = ssrProperties.cache().html();
    HttpHeaders headers = new HttpHeaders();
    headers.add("X-Cache", resposta.statusCache().name());
    headers.add(HttpHeaders.VARY, "X-Language,Accept-Language");
    headers.setCacheControl(CacheControl.maxAge(html.ttlSeconds(), TimeUnit.SECONDS).cachePublic());
    if (resposta.etag() != null) {
      headers.setETag(resposta.etag());
    }
    return headers;
  }

  private boolean naoModificado(HttpServletRequest request, String etag) {
    if (etag == null) {
      return false;
    }
    String ifNoneMatch = request.getHeader(HttpHeaders.IF_NONE_MATCH);
    return etag.equals(ifNoneMatch);
  }

  /**
   * Falha transitória do renderer: responde 503 + Retry-After para que crawlers
   * tentem de novo sem indexar uma página vazia.
   */
  private ResponseEntity<String> indisponivel(String caminho, int status) {
    log.warn("SSR indisponivel para {} (status renderer={})", caminho, status);
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .header(HttpHeaders.RETRY_AFTER, "30")
        .contentType(MediaType.valueOf("text/html;charset=UTF-8"))
        .body("<!doctype html><title>Carregando…</title>"
            + "<p>Conteúdo sendo preparado. Atualize em instantes.</p>");
  }
}
