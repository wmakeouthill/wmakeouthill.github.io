package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.port.out.RenderizadorMarkdownPort;
import com.wmakeouthill.portfolio.infrastructure.config.CaffeineCacheConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Obtém o Markdown de um projeto e o renderiza para HTML no backend, cacheando
 * o resultado por {@code slug:idioma} no cache {@code markdownHtml}.
 *
 * Assim o cliente (e os bots) recebem HTML pronto, sem render no browser.
 */
@Service
@RequiredArgsConstructor
public class RenderizarMarkdownProjetoUseCase {

  private final ObterMarkdownProjetoUseCase obterMarkdownProjetoUseCase;
  private final RenderizadorMarkdownPort renderizadorMarkdown;

  @Cacheable(cacheNames = CaffeineCacheConfig.CACHE_MARKDOWN, key = "#slug + ':' + #language", unless = "#result == null || #result.isEmpty()")
  public Optional<String> executar(String slug, String language) {
    return obterMarkdownProjetoUseCase.executar(slug, language)
        .map(renderizadorMarkdown::renderizarParaHtml);
  }
}
