package com.wmakeouthill.portfolio.infrastructure.markdown;

import com.wmakeouthill.portfolio.application.port.out.RenderizadorMermaidPort;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CommonmarkRenderizadorAdapterTest {

  private final RenderizadorMermaidPort mermaid = mock(RenderizadorMermaidPort.class);
  private final CommonmarkRenderizadorAdapter adapter = new CommonmarkRenderizadorAdapter(mermaid);

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
  void renderizarParaHtml_deveEmbutirSvgQuandoMermaidRenderiza() {
    when(mermaid.renderizarParaSvg(anyString())).thenReturn(Optional.of("<svg>diagrama</svg>"));

    String html = adapter.renderizarParaHtml("```mermaid\ngraph TD; A-->B;\n```");

    assertThat(html).contains("mermaid-diagram");
    assertThat(html).contains("<svg>diagrama</svg>");
    assertThat(html).doesNotContain("<code");
  }

  @Test
  void renderizarParaHtml_deveManterBlocoComoTextoQuandoMermaidFalha() {
    when(mermaid.renderizarParaSvg(anyString())).thenReturn(Optional.empty());

    String html = adapter.renderizarParaHtml("```mermaid\ngraph TD; A-->B;\n```");

    assertThat(html).contains("graph TD");
    assertThat(html).doesNotContain("<svg>");
  }

  @Test
  void renderizarParaHtml_deveRetornarVazioParaEntradaVazia() {
    assertThat(adapter.renderizarParaHtml(null)).isEmpty();
    assertThat(adapter.renderizarParaHtml("   ")).isEmpty();
  }
}
