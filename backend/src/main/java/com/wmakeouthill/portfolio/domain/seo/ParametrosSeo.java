package com.wmakeouthill.portfolio.domain.seo;

import java.util.List;

/**
 * Metadados de SEO de uma rota pública, prontos para o {@code SeoHeadBuilder}
 * montar o {@code <head>} final do HTML.
 */
public record ParametrosSeo(
    String titulo,
    String descricao,
    String urlCanonica,
    String imagemOg,
    String locale,
    String robots,
    List<Alternate> alternates,
    List<String> blocosJsonLd) {

  public ParametrosSeo {
    alternates = (alternates == null) ? List.of() : List.copyOf(alternates);
    blocosJsonLd = (blocosJsonLd == null) ? List.of() : List.copyOf(blocosJsonLd);
  }

  /** Link alternativo por idioma (hreflang). */
  public record Alternate(String hreflang, String href) {
  }
}
