package com.wmakeouthill.portfolio.infrastructure.rendering;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.WaitUntilState;
import com.wmakeouthill.portfolio.application.port.out.RenderizadorMermaidPort;
import com.wmakeouthill.portfolio.infrastructure.config.CaffeineCacheConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Renderiza Mermaid → SVG via Chromium (Playwright). Resiliente: qualquer falha
 * (browser ausente, sintaxe inválida, timeout) retorna {@link Optional#empty()},
 * e o chamador mantém o código como texto indexável.
 *
 * O resultado é cacheado em {@code mermaidSvg} (chave = código do diagrama),
 * então o custo do Chromium ocorre uma única vez por diagrama distinto.
 */
@Slf4j
@Component
public class PlaywrightMermaidAdapter implements RenderizadorMermaidPort {

  private static final String MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
  private static final double RENDER_TIMEOUT_MS = 8000;

  @Override
  @Cacheable(cacheNames = CaffeineCacheConfig.CACHE_MERMAID, key = "#codigoMermaid", unless = "#result == null || #result.isEmpty()")
  public Optional<String> renderizarParaSvg(String codigoMermaid) {
    if (codigoMermaid == null || codigoMermaid.isBlank()) {
      return Optional.empty();
    }
    try (Playwright playwright = Playwright.create();
        Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
            .setHeadless(true)
            .setArgs(List.of("--no-sandbox", "--disable-dev-shm-usage")))) {
      Page page = browser.newPage();
      page.setDefaultTimeout(RENDER_TIMEOUT_MS);
      page.setContent(montarPagina(), new Page.SetContentOptions().setWaitUntil(WaitUntilState.NETWORKIDLE));
      page.waitForFunction("() => typeof window.mermaid !== 'undefined'");
      Object svg = page.evaluate(SCRIPT_RENDER, codigoMermaid);
      if (svg instanceof String texto && !texto.isBlank()) {
        return Optional.of(texto);
      }
      return Optional.empty();
    } catch (Exception e) {
      log.warn("Falha ao renderizar Mermaid (mantendo como texto): {}", e.getMessage());
      return Optional.empty();
    }
  }

  private String montarPagina() {
    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
        + "<script src=\"" + MERMAID_CDN + "\"></script></head>"
        + "<body><script>window.mermaid && window.mermaid.initialize({startOnLoad:false});</script></body></html>";
  }

  private static final String SCRIPT_RENDER =
      "async (code) => { try { const { svg } = await window.mermaid.render('mmd-' + Date.now(), code); return svg; }"
          + " catch (e) { return ''; } }";
}
