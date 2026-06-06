package com.wmakeouthill.portfolio.application.seo;

import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.usecase.ListarProjetosGithubUseCase;
import com.wmakeouthill.portfolio.infrastructure.config.CaffeineCacheConfig;
import com.wmakeouthill.portfolio.infrastructure.config.SiteProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Gera {@code sitemap.xml} (com hreflang en↔pt) e {@code robots.txt}.
 *
 * Apenas rotas públicas válidas entram; {@code /api/*} é bloqueado no robots.
 * Resultado cacheado em {@code githubData}.
 */
@Service
@RequiredArgsConstructor
public class GerarSitemapUseCase {

  private final ListarProjetosGithubUseCase listarProjetosGithubUseCase;
  private final SiteProperties site;

  @Cacheable(cacheNames = CaffeineCacheConfig.CACHE_GITHUB_DATA, key = "'sitemap'")
  public String gerarSitemap() {
    StringBuilder sb = new StringBuilder(2048);
    sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" ");
    sb.append("xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n");

    adicionarUrl(sb, "/");
    adicionarUrl(sb, "/projects");
    for (GithubRepositoryDto repo : listarProjetosGithubUseCase.executar()) {
      adicionarUrl(sb, "/projects/" + repo.name().toLowerCase());
    }

    sb.append("</urlset>\n");
    return sb.toString();
  }

  @Cacheable(cacheNames = CaffeineCacheConfig.CACHE_GITHUB_DATA, key = "'robots'")
  public String gerarRobots() {
    return "User-agent: *\n"
        + "Allow: /\n"
        + "Disallow: /api/\n"
        + "Sitemap: " + site.baseUrlSemBarraFinal() + "/sitemap.xml\n";
  }

  private void adicionarUrl(StringBuilder sb, String caminho) {
    String pt = absoluta(caminho);
    String en = absoluta("/en" + ("/".equals(caminho) ? "" : caminho));
    sb.append("  <url>\n");
    sb.append("    <loc>").append(pt).append("</loc>\n");
    alternate(sb, "pt-BR", pt);
    alternate(sb, "en", en);
    alternate(sb, "x-default", pt);
    sb.append("  </url>\n");
  }

  private void alternate(StringBuilder sb, String hreflang, String href) {
    sb.append("    <xhtml:link rel=\"alternate\" hreflang=\"").append(hreflang)
        .append("\" href=\"").append(href).append("\"/>\n");
  }

  private String absoluta(String caminho) {
    return escaparXml(site.baseUrlSemBarraFinal() + caminho);
  }

  private String escaparXml(String valor) {
    return valor.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }

  public List<String> rotasPublicas() {
    var rotas = new java.util.ArrayList<String>();
    rotas.add("/");
    rotas.add("/projects");
    for (GithubRepositoryDto repo : listarProjetosGithubUseCase.executar()) {
      rotas.add("/projects/" + repo.name().toLowerCase());
    }
    return rotas;
  }
}
