package com.wmakeouthill.portfolio.infrastructure.markdown;

import com.wmakeouthill.portfolio.application.port.out.RenderizadorMarkdownPort;
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

/**
 * Renderiza Markdown para HTML com commonmark (GFM tables + autolink).
 *
 * Diagramas Mermaid NÃO são renderizados no servidor: o Chromium/Playwright não
 * sobe de forma confiável na VM de ~1GB ("Failed to create driver") e cada
 * tentativa por diagrama somava ~55s sem nunca cachear, estourando o timeout da
 * função SSR. Em vez disso, emitimos {@code <pre class="mermaid">código</pre>}
 * e o frontend renderiza o diagrama no browser (mermaid@11 já é dependência).
 * Bots ainda recebem o código do diagrama como texto indexável.
 *
 * Conteúdo de fonte própria (READMEs dos repositórios do autor); o HTML inline
 * do Markdown é mantido. Para conteúdo de terceiros, adicionar allowlist (jsoup).
 */
@Slf4j
@Component
public class CommonmarkRenderizadorAdapter implements RenderizadorMarkdownPort {

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
   * Troca blocos ```mermaid por um {@link HtmlBlock} com {@code <pre class="mermaid">},
   * que o frontend renderiza no browser. O código fica como texto (indexável e
   * legível mesmo se o JS falhar).
   */
  private static final class SubstituidorMermaid extends AbstractVisitor {
    @Override
    public void visit(FencedCodeBlock block) {
      String info = block.getInfo();
      if (info == null || !info.trim().toLowerCase(Locale.ROOT).startsWith("mermaid")) {
        return;
      }
      HtmlBlock bloco = new HtmlBlock();
      bloco.setLiteral("<pre class=\"mermaid\">" + escaparHtml(block.getLiteral()) + "</pre>\n");
      block.insertAfter(bloco);
      block.unlink();
    }

    private static String escaparHtml(String texto) {
      return texto
          .replace("&", "&amp;")
          .replace("<", "&lt;")
          .replace(">", "&gt;");
    }
  }
}
