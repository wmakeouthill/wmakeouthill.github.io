package com.wmakeouthill.portfolio.application.seo;

import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.port.out.SerializadorJsonPort;
import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
import com.wmakeouthill.portfolio.domain.seo.ParametrosSeo;
import com.wmakeouthill.portfolio.infrastructure.config.SiteProperties;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SeoSitemapTest {

  private final SiteProperties site = new SiteProperties("https://meu-site.dev/");
  private final SerializadorJsonPort json = mock(SerializadorJsonPort.class);

  @Test
  void metadados_home_devemTerCanonicalSemPrefixoEAlternates() {
    when(json.serializar(any())).thenReturn("{}");
    ConstruirMetadadosSeoUseCase uc = new ConstruirMetadadosSeoUseCase(site, json);

    ParametrosSeo pt = uc.paraHome("pt");

    assertThat(pt.urlCanonica()).isEqualTo("https://meu-site.dev/");
    assertThat(pt.locale()).isEqualTo("pt_BR");
    assertThat(pt.alternates()).hasSize(3);
    assertThat(pt.blocosJsonLd()).hasSize(2);
  }

  @Test
  void metadados_projetoEmIngles_devemUsarPrefixoEn() {
    when(json.serializar(any())).thenReturn("{}");
    ConstruirMetadadosSeoUseCase uc = new ConstruirMetadadosSeoUseCase(site, json);

    ParametrosSeo en = uc.paraProjeto(repo("AA-Space"), "en");

    assertThat(en.urlCanonica()).isEqualTo("https://meu-site.dev/en/projects/aa-space");
    assertThat(en.titulo()).startsWith("AA-Space");
  }

  @Test
  void sitemap_deveListarRotasComHreflangEProjetos() {
    PortfolioContentPort conteudo = mock(PortfolioContentPort.class);
    when(conteudo.carregarMarkdownsDetalhados("pt")).thenReturn(List.of(markdown("aa-space")));
    when(conteudo.carregarMarkdownsDetalhados("en")).thenReturn(List.of(
        markdown("aa-space-english"),
        markdown("english-only-english")));
    GerarSitemapUseCase uc = new GerarSitemapUseCase(conteudo, site);

    String xml = uc.gerarSitemap();

    assertThat(xml).contains("<loc>https://meu-site.dev/</loc>");
    assertThat(xml).contains("<loc>https://meu-site.dev/en</loc>");
    assertThat(xml).contains("<loc>https://meu-site.dev/projects/aa-space</loc>");
    assertThat(xml).contains("<loc>https://meu-site.dev/en/projects/aa-space</loc>");
    assertThat(xml).contains("hreflang=\"en\" href=\"https://meu-site.dev/en/projects/aa-space\"");
    assertThat(xml).contains("<loc>https://meu-site.dev/projects/english-only</loc>");
    assertThat(xml).doesNotContain("aa-space-english");
  }

  @Test
  void robots_deveBloquearApiEApontarSitemap() {
    PortfolioContentPort conteudo = mock(PortfolioContentPort.class);
    GerarSitemapUseCase uc = new GerarSitemapUseCase(conteudo, site);

    String robots = uc.gerarRobots();

    assertThat(robots).contains("Disallow: /api/");
    assertThat(robots).contains("Sitemap: https://meu-site.dev/sitemap.xml");
  }

  private GithubRepositoryDto repo(String nome) {
    return new GithubRepositoryDto(1L, nome, "wmakeouthill/" + nome, "Descricao do projeto",
        "https://github.com/wmakeouthill/" + nome, null, 5, 1, "Java",
        List.of(), "2024-01-01", "2024-02-01", "2024-03-01", false, List.of(), 1000L);
  }

  private PortfolioMarkdownResource markdown(String nome) {
    return new PortfolioMarkdownResource(nome, "projetos/" + nome + ".md", "# " + nome,
        true, false, Set.of());
  }
}
