package com.wmakeouthill.portfolio.application.seo;

import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.port.out.SerializadorJsonPort;
import com.wmakeouthill.portfolio.domain.seo.ParametrosSeo;
import com.wmakeouthill.portfolio.infrastructure.config.SiteProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Constrói os {@link ParametrosSeo} de cada rota pública: título, descrição,
 * canonical, Open Graph/Twitter, hreflang (en↔pt) e JSON-LD.
 *
 * Convenção de idioma: {@code pt} é o default sem prefixo; {@code en} usa
 * prefixo {@code /en}. O canonical aponta para a variante do idioma corrente.
 */
@Service
@RequiredArgsConstructor
public class ConstruirMetadadosSeoUseCase {

  private static final String NOME = "Wesley de Carvalho";
  private static final String IMAGEM_OG_PADRAO = "/assets/images/og-default.png";
  private static final String ROBOTS_INDEXAVEL = "index,follow";
  private static final List<String> REDES = List.of(
      "https://github.com/wmakeouthill",
      "https://www.linkedin.com/in/wesley-carvalho");

  private final SiteProperties site;
  private final SerializadorJsonPort json;

  public ParametrosSeo paraHome(String lang) {
    boolean en = ehIngles(lang);
    String titulo = en
        ? NOME + " — Full Stack Developer"
        : NOME + " — Desenvolvedor Full Stack";
    String descricao = en
        ? "Portfolio of " + NOME + ": full stack projects (Java, Spring, Angular), open-source work and experience."
        : "Portfólio de " + NOME + ": projetos full stack (Java, Spring, Angular), trabalhos open-source e experiência.";
    return montar(titulo, descricao, "/", lang, List.of(jsonLdPessoa(lang), jsonLdWebsite()));
  }

  public ParametrosSeo paraListaProjetos(String lang) {
    boolean en = ehIngles(lang);
    String titulo = (en ? "Projects" : "Projetos") + " — " + NOME;
    String descricao = en
        ? "Open-source and full stack projects built by " + NOME + "."
        : "Projetos open-source e full stack desenvolvidos por " + NOME + ".";
    return montar(titulo, descricao, "/projects", lang, List.of(jsonLdBreadcrumb(lang, null, null)));
  }

  public ParametrosSeo paraProjeto(GithubRepositoryDto repo, String lang) {
    boolean en = ehIngles(lang);
    String slug = repo.name().toLowerCase();
    String descricaoBase = (repo.description() == null || repo.description().isBlank())
        ? (en ? "Project " + repo.name() : "Projeto " + repo.name())
        : repo.description();
    String titulo = repo.name() + " — " + NOME;
    String caminho = "/projects/" + slug;
    return montar(titulo, descricaoBase, caminho, lang,
        List.of(jsonLdProjeto(repo, descricaoBase), jsonLdBreadcrumb(lang, repo.name(), slug)));
  }

  private ParametrosSeo montar(String titulo, String descricao, String caminho, String lang, List<String> jsonLd) {
    return new ParametrosSeo(
        titulo,
        descricao,
        urlAbsoluta(caminhoPorIdioma(caminho, lang)),
        urlAbsoluta(IMAGEM_OG_PADRAO),
        ehIngles(lang) ? "en_US" : "pt_BR",
        ROBOTS_INDEXAVEL,
        alternates(caminho),
        jsonLd);
  }

  private List<ParametrosSeo.Alternate> alternates(String caminho) {
    String pt = urlAbsoluta(caminho);
    String en = urlAbsoluta("/en" + ("/".equals(caminho) ? "" : caminho));
    return List.of(
        new ParametrosSeo.Alternate("pt-BR", pt),
        new ParametrosSeo.Alternate("en", en),
        new ParametrosSeo.Alternate("x-default", pt));
  }

  private String caminhoPorIdioma(String caminho, String lang) {
    if (!ehIngles(lang)) {
      return caminho;
    }
    return "/en" + ("/".equals(caminho) ? "" : caminho);
  }

  private String urlAbsoluta(String caminho) {
    return site.baseUrlSemBarraFinal() + caminho;
  }

  private String jsonLdPessoa(String lang) {
    Map<String, Object> pessoa = baseLd("Person");
    pessoa.put("name", NOME);
    pessoa.put("url", site.baseUrlSemBarraFinal() + "/");
    pessoa.put("image", urlAbsoluta(IMAGEM_OG_PADRAO));
    pessoa.put("jobTitle", ehIngles(lang) ? "Full Stack Developer" : "Desenvolvedor Full Stack");
    pessoa.put("sameAs", REDES);
    return json.serializar(pessoa);
  }

  private String jsonLdWebsite() {
    Map<String, Object> site_ = baseLd("WebSite");
    site_.put("name", NOME);
    site_.put("url", site.baseUrlSemBarraFinal() + "/");
    return json.serializar(site_);
  }

  private String jsonLdProjeto(GithubRepositoryDto repo, String descricao) {
    Map<String, Object> obra = baseLd("SoftwareSourceCode");
    obra.put("name", repo.name());
    obra.put("description", descricao);
    obra.put("codeRepository", repo.htmlUrl());
    if (repo.language() != null) {
      obra.put("programmingLanguage", repo.language());
    }
    if (repo.pushedAt() != null) {
      obra.put("dateModified", repo.pushedAt());
    }
    obra.put("author", Map.of("@type", "Person", "name", NOME));
    obra.put("url", urlAbsoluta("/projects/" + repo.name().toLowerCase()));
    return json.serializar(obra);
  }

  private String jsonLdBreadcrumb(String lang, String nomeProjeto, String slug) {
    String home = ehIngles(lang) ? "Home" : "Início";
    String projetos = ehIngles(lang) ? "Projects" : "Projetos";
    var itens = new java.util.ArrayList<Map<String, Object>>();
    itens.add(itemBreadcrumb(1, home, urlAbsoluta(caminhoPorIdioma("/", lang))));
    itens.add(itemBreadcrumb(2, projetos, urlAbsoluta(caminhoPorIdioma("/projects", lang))));
    if (nomeProjeto != null && slug != null) {
      itens.add(itemBreadcrumb(3, nomeProjeto, urlAbsoluta(caminhoPorIdioma("/projects/" + slug, lang))));
    }
    Map<String, Object> lista = baseLd("BreadcrumbList");
    lista.put("itemListElement", itens);
    return json.serializar(lista);
  }

  private Map<String, Object> itemBreadcrumb(int posicao, String nome, String url) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("@type", "ListItem");
    item.put("position", posicao);
    item.put("name", nome);
    item.put("item", url);
    return item;
  }

  private Map<String, Object> baseLd(String tipo) {
    Map<String, Object> mapa = new LinkedHashMap<>();
    mapa.put("@context", "https://schema.org");
    mapa.put("@type", tipo);
    return mapa;
  }

  private boolean ehIngles(String lang) {
    return lang != null && lang.toLowerCase().startsWith("en");
  }
}
