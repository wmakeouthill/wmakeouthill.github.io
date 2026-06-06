package com.wmakeouthill.portfolio.infrastructure.seo;

import com.wmakeouthill.portfolio.domain.seo.ParametrosSeo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SeoHeadBuilderTest {

  private final SeoHeadBuilder builder = new SeoHeadBuilder();

  @Test
  void montar_deveGerarTituloCanonicalOgEHreflang() {
    ParametrosSeo seo = new ParametrosSeo(
        "Titulo & Teste",
        "Descricao",
        "https://site/projects",
        "https://site/og.png",
        "pt_BR",
        "index,follow",
        List.of(new ParametrosSeo.Alternate("en", "https://site/en/projects")),
        List.of("{\"@type\":\"Person\"}"));

    String head = builder.montar(seo);

    assertThat(head).contains("<title>Titulo &amp; Teste</title>");
    assertThat(head).contains("<link rel=\"canonical\" href=\"https://site/projects\">");
    assertThat(head).contains("<meta property=\"og:title\" content=\"Titulo &amp; Teste\">");
    assertThat(head).contains("<meta name=\"twitter:card\" content=\"summary_large_image\">");
    assertThat(head).contains("hreflang=\"en\" href=\"https://site/en/projects\"");
    assertThat(head).contains("application/ld+json");
  }

  @Test
  void montar_deveNeutralizarFechamentoDeScriptNoJsonLd() {
    ParametrosSeo seo = new ParametrosSeo("t", "d", "u", "i", "pt_BR", "index,follow",
        List.of(), List.of("{\"x\":\"</script>\"}"));

    String head = builder.montar(seo);

    assertThat(head).doesNotContain("</script>\"}");
    assertThat(head).contains("<\\/script>");
  }
}
