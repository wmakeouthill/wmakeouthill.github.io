package com.wmakeouthill.portfolio.infrastructure.markdown;

import com.wmakeouthill.portfolio.application.port.out.RenderizadorMarkdownPort;
import com.wmakeouthill.portfolio.application.port.out.RenderizadorMermaidPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.commonmark.Extension;
import org.commonmark.ext.autolink.AutolinkExtension;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.node.AbstractVisitor;
import org.commonmark.node.FencedCodeBlock;
import org.commonmark.node.HtmlBlock;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Renderiza Markdown para HTML com commonmark (GFM tables + autolink) e embute
 * diagramas Mermaid como SVG.
 *
 * Conteúdo de fonte própria (READMEs dos repositórios do autor); o HTML inline
 * do Markdown é mantido. Para conteúdo de terceiros, adicionar allowlist (jsoup).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommonmarkRenderizadorAdapter implements RenderizadorMarkdownPort {

  private final RenderizadorMermaidPort renderizadorMermaid;

  private final List<Extension> extensoes = List.of(
      TablesExtension.create(),
      AutolinkExtension.create());
  private final Parser parser = Parser.builder().extensions(extensoes).build();
  private final HtmlRenderer renderer = HtmlRenderer.builder().extensions(extensoes).build();

  @Override
  public String renderizarParaHtml(String markdown) {
    if (markdown == null || markdown.isBlank()) {
      return "";
    }
    Node documento = parser.parse(markdown);
    documento.accept(new SubstituidorMermaid());
    return renderer.render(documento);
  }

  /**
   * Troca blocos ```mermaid por um {@link HtmlBlock} com o SVG renderizado.
   * Se a renderização falhar, mantém o bloco original (texto indexável).
   */
  private final class SubstituidorMermaid extends AbstractVisitor {
    @Override
    public void visit(FencedCodeBlock block) {
      String info = block.getInfo();
      if (info == null || !info.trim().toLowerCase(Locale.ROOT).startsWith("mermaid")) {
        return;
      }
      Optional<String> svg = renderizadorMermaid.renderizarParaSvg(block.getLiteral());
      if (svg.isEmpty()) {
        return;
      }
      HtmlBlock bloco = new HtmlBlock();
      bloco.setLiteral("<div class=\"mermaid-diagram\">" + svg.get() + "</div>\n");
      block.insertAfter(bloco);
      block.unlink();
    }
  }
}
