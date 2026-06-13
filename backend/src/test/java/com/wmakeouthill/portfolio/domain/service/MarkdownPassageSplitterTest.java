package com.wmakeouthill.portfolio.domain.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MarkdownPassageSplitterTest {

  private static final int MAX_CHARS = 2800;

  private final MarkdownPassageSplitter splitter = new MarkdownPassageSplitter();

  @Test
  void retornaListaVaziaParaEntradaNulaOuVazia() {
    assertThat(splitter.dividir(null)).isEmpty();
    assertThat(splitter.dividir("")).isEmpty();
    assertThat(splitter.dividir("   \n  ")).isEmpty();
  }

  @Test
  void separaUmaPassagemPorCabecalho() {
    String markdown = """
        # Título
        Intro do documento.

        ## Seção A
        Conteúdo da seção A.

        ## Seção B
        Conteúdo da seção B.
        """;

    List<String> passagens = splitter.dividir(markdown);

    assertThat(passagens).hasSize(3);
    assertThat(passagens.get(0)).startsWith("# Título");
    assertThat(passagens.get(1)).startsWith("## Seção A");
    assertThat(passagens.get(2)).startsWith("## Seção B");
  }

  @Test
  void mantemConteudoAntesDoPrimeiroCabecalhoComoPassagem() {
    String markdown = """
        Texto sem cabeçalho no começo.

        # Depois vem um título
        Corpo.
        """;

    List<String> passagens = splitter.dividir(markdown);

    assertThat(passagens).hasSize(2);
    assertThat(passagens.get(0)).contains("Texto sem cabeçalho");
    assertThat(passagens.get(1)).startsWith("# Depois vem um título");
  }

  @Test
  void quebraSecaoGrandePreservandoCabecalhoEmCadaSubpassagem() {
    String paragrafo = "Linha de conteúdo repetida. ".repeat(60); // ~1680 chars
    String markdown = "## Seção Grande\n\n"
        + paragrafo + "\n\n"
        + paragrafo + "\n\n"
        + paragrafo;

    List<String> passagens = splitter.dividir(markdown);

    assertThat(passagens).hasSizeGreaterThan(1);
    assertThat(passagens).allSatisfy(p -> assertThat(p).startsWith("## Seção Grande"));
    assertThat(passagens).allSatisfy(p -> assertThat(p.length()).isLessThanOrEqualTo(MAX_CHARS + 100));
  }

  @Test
  void quebraParagrafoGiganteIsoladoPorTamanho() {
    String gigante = "X".repeat(MAX_CHARS * 3 + 500);
    String markdown = "# Doc\n\n" + gigante;

    List<String> passagens = splitter.dividir(markdown);

    assertThat(passagens).hasSizeGreaterThanOrEqualTo(3);
    assertThat(passagens).allSatisfy(p -> assertThat(p.length()).isLessThanOrEqualTo(MAX_CHARS + 100));
  }

  @Test
  void nenhumaPassagemEhVazia() {
    String markdown = """
        # A

        ## B

        Conteúdo.
        """;

    List<String> passagens = splitter.dividir(markdown);

    assertThat(passagens).isNotEmpty();
    assertThat(passagens).allSatisfy(p -> assertThat(p.isBlank()).isFalse());
  }
}
