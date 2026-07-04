package com.wmakeouthill.portfolio.infrastructure.content;

import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CaseMarkdownSupportTest {

  private CaseMarkdownSupport support;

  @BeforeEach
  void setUp() {
    support = new CaseMarkdownSupport(new CaseFrontmatterParser());
  }

  @Test
  void prepararCorpoPublico_deveRemoverSecaoStarEmPortugues() {
    String markdown = """
        ---
        title: Dux Workflow
        ---
        ## Resultados

        Texto público.

        ## Destaques para entrevista (STAR resumido)

        - **S/T:** nota interna.
        """;

    String publico = support.prepararCorpoPublico(markdown);

    assertThat(publico).contains("Texto público.");
    assertThat(publico).doesNotContain("Destaques para entrevista");
    assertThat(publico).doesNotContain("nota interna");
  }

  @Test
  void prepararCorpoPublico_deveRemoverSecaoStarEmIngles() {
    String markdown = """
        ---
        title: Dux Workflow
        ---
        ## Impact

        Public text.

        ## Interview highlights (STAR summary)

        - **S/T:** internal note.
        """;

    String publico = support.prepararCorpoPublico(markdown);

    assertThat(publico).contains("Public text.");
    assertThat(publico).doesNotContain("Interview highlights");
    assertThat(publico).doesNotContain("internal note");
  }

  @Test
  void prepararCorpoPublico_deveRemoverBlocoPortfolioInternal() {
    String corpo = """
        ## Público

        Visível.

        <!-- portfolio-internal -->
        Só para mim.
        <!-- /portfolio-internal -->
        """;

    assertThat(support.prepararCorpoPublico("---\ntitle: X\n---\n" + corpo))
        .contains("Visível.")
        .doesNotContain("Só para mim");
  }

  @Test
  void converter_paraRag_deveManterSecaoStar() {
    String markdown = """
        ---
        title: Case
        client: Cliente
        category: freela
        stack: [Java]
        ---
        ## Público

        OK.

        ## Destaques para entrevista (STAR resumido)

        - STAR aqui.
        """;

    var recurso = support.converter(
        new com.wmakeouthill.portfolio.application.dto.RepositoryFileDto(
            "case.md", "case", "portfolio-content/cases/freelas/case.md",
            "https://raw/case.md", "https://github/case.md", 1L, "sha", "file"),
        markdown,
        "case",
        10_000);

    assertThat(recurso).isPresent();
    assertThat(recurso.get().conteudo()).contains("STAR aqui.");
  }
}
