package com.wmakeouthill.portfolio.infrastructure.markdown;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CommonmarkRenderizadorAdapterTest {

  private final CommonmarkRenderizadorAdapter adapter = new CommonmarkRenderizadorAdapter();

  @Test
  void renderizarParaHtml_deveConverterTitulosEParagrafos() {
    String html = adapter.renderizarParaHtml("# Titulo\n\nUm paragrafo.");

    assertThat(html).contains("<h1>Titulo</h1>");
    assertThat(html).contains("<p>Um paragrafo.</p>");
  }

  @Test
  void renderizarParaHtml_deveRenderizarTabelasGfm() {
    String md = "| A | B |\n| - | - |\n| 1 | 2 |";

    String html = adapter.renderizarParaHtml(md);

    assertThat(html).contains("<table>");
    assertThat(html).contains("<td>1</td>");
  }

  @Test
  void renderizarParaHtml_deveEmitirBlocoMermaidParaRenderClientSide() {
    String html = adapter.renderizarParaHtml("```mermaid\ngraph TD; A-->B;\n```");

    assertThat(html).contains("<pre class=\"mermaid\">");
    // Código preservado como texto (indexável) e HTML escapado.
    assertThat(html).contains("graph TD; A--&gt;B;");
    assertThat(html).doesNotContain("<code");
  }

  @Test
  void renderizarParaHtml_deveEscaparHtmlNoCodigoMermaid() {
    String html = adapter.renderizarParaHtml("```mermaid\nA[\"<script>\"] --> B\n```");

    assertThat(html).contains("&lt;script&gt;");
    assertThat(html).doesNotContain("<script>");
  }

  @Test
  void renderizarParaHtml_deveRetornarVazioParaEntradaVazia() {
    assertThat(adapter.renderizarParaHtml(null)).isEmpty();
    assertThat(adapter.renderizarParaHtml("   ")).isEmpty();
  }
}
