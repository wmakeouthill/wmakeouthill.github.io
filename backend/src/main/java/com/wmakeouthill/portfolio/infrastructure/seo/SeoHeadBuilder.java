package com.wmakeouthill.portfolio.infrastructure.seo;

import com.wmakeouthill.portfolio.domain.seo.ParametrosSeo;
import org.springframework.stereotype.Component;

/**
 * Monta o fragmento {@code <head>} (título, meta, canonical, Open Graph,
 * Twitter, hreflang e JSON-LD) a partir dos {@link ParametrosSeo}.
 *
 * O fragmento é injetado no HTML pelo edge SSR (Fase 5), garantindo que o HTML
 * cacheado já saia com todos os metadados.
 */
@Component
public class SeoHeadBuilder {

  public String montar(ParametrosSeo seo) {
    StringBuilder sb = new StringBuilder(1024);
    sb.append("<title>").append(escaparTexto(seo.titulo())).append("</title>\n");
    metaName(sb, "description", seo.descricao());
    metaName(sb, "robots", seo.robots());
    link(sb, "canonical", seo.urlCanonica());

    metaProperty(sb, "og:type", "website");
    metaProperty(sb, "og:title", seo.titulo());
    metaProperty(sb, "og:description", seo.descricao());
    metaProperty(sb, "og:url", seo.urlCanonica());
    metaProperty(sb, "og:image", seo.imagemOg());
    metaProperty(sb, "og:locale", seo.locale());

    metaName(sb, "twitter:card", "summary_large_image");
    metaName(sb, "twitter:title", seo.titulo());
    metaName(sb, "twitter:description", seo.descricao());
    metaName(sb, "twitter:image", seo.imagemOg());

    for (ParametrosSeo.Alternate alt : seo.alternates()) {
      sb.append("<link rel=\"alternate\" hreflang=\"").append(escaparAtributo(alt.hreflang()))
          .append("\" href=\"").append(escaparAtributo(alt.href())).append("\">\n");
    }

    for (String bloco : seo.blocosJsonLd()) {
      sb.append("<script type=\"application/ld+json\">").append(sanitizarJson(bloco)).append("</script>\n");
    }
    return sb.toString();
  }

  private void metaName(StringBuilder sb, String nome, String conteudo) {
    if (conteudo == null || conteudo.isBlank()) {
      return;
    }
    sb.append("<meta name=\"").append(nome).append("\" content=\"")
        .append(escaparAtributo(conteudo)).append("\">\n");
  }

  private void metaProperty(StringBuilder sb, String propriedade, String conteudo) {
    if (conteudo == null || conteudo.isBlank()) {
      return;
    }
    sb.append("<meta property=\"").append(propriedade).append("\" content=\"")
        .append(escaparAtributo(conteudo)).append("\">\n");
  }

  private void link(StringBuilder sb, String rel, String href) {
    if (href == null || href.isBlank()) {
      return;
    }
    sb.append("<link rel=\"").append(rel).append("\" href=\"")
        .append(escaparAtributo(href)).append("\">\n");
  }

  private String escaparTexto(String valor) {
    if (valor == null) {
      return "";
    }
    return valor.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }

  private String escaparAtributo(String valor) {
    if (valor == null) {
      return "";
    }
    return escaparTexto(valor).replace("\"", "&quot;");
  }

  /** Evita quebra do bloco JSON-LD com {@code </script>} embutido. */
  private String sanitizarJson(String json) {
    if (json == null) {
      return "{}";
    }
    return json.replace("</", "<\\/");
  }
}
