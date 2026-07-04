package com.wmakeouthill.portfolio.infrastructure.markdown;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CaseFrontmatterParserTest {

  private final CaseFrontmatterParser parser = new CaseFrontmatterParser();

  @Test
  void extrair_comFrontmatterCompleto_devePreencherCamposERemoverBlocoDoCorpo() {
    String md = """
        ---
        title: Sol — Central omnichannel
        client: Cliente corporativo
        category: freela
        status: Produção
        stack: [FastAPI, Angular 20, pgvector]
        order: 5
        gallery: mercearia-r-v
        ---
        # Case — Sol

        Corpo do case.
        """;

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isEqualTo("Sol — Central omnichannel");
    assertThat(fm.client()).isEqualTo("Cliente corporativo");
    assertThat(fm.category()).isEqualTo("freela");
    assertThat(fm.status()).isEqualTo("Produção");
    assertThat(fm.stack()).containsExactly("FastAPI", "Angular 20", "pgvector");
    assertThat(fm.order()).isEqualTo(5);
    assertThat(fm.gallery()).isEqualTo("mercearia-r-v");
    assertThat(fm.corpo()).startsWith("# Case — Sol");
    assertThat(fm.corpo()).doesNotContain("---");
  }

  @Test
  void extrair_semFrontmatter_deveDevolverCorpoIntactoECamposNulos() {
    String md = "# Case sem frontmatter\n\nCorpo.";

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isNull();
    assertThat(fm.stack()).isEmpty();
    assertThat(fm.order()).isNull();
    assertThat(fm.corpo()).isEqualTo(md);
  }

  @Test
  void extrair_comYamlInvalido_deveRemoverBlocoEManterCamposNulos() {
    String md = "---\ntitle: [aberto sem fechar\n---\n# Corpo\n";

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isNull();
    assertThat(fm.corpo()).startsWith("# Corpo");
  }

  @Test
  void extrair_comCrlf_deveFuncionar() {
    String md = "---\r\ntitle: Case CRLF\r\n---\r\n# Corpo\r\n";

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isEqualTo("Case CRLF");
    assertThat(fm.corpo()).startsWith("# Corpo");
  }

  @Test
  void extrair_nulo_deveDevolverVazio() {
    CaseFrontmatter fm = parser.extrair(null);

    assertThat(fm.corpo()).isEmpty();
    assertThat(fm.title()).isNull();
  }
}
