package com.wmakeouthill.portfolio.application.seo;

import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.port.out.SerializadorJsonPort;
import com.wmakeouthill.portfolio.application.usecase.ListarProjetosGithubUseCase;
import com.wmakeouthill.portfolio.domain.seo.ParametrosSeo;
import com.wmakeouthill.portfolio.infrastructure.config.SiteProperties;
import org.junit.jupiter.api.Test;

import java.util.List;

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
    ListarProjetosGithubUseCase listar = mock(ListarProjetosGithubUseCase.class);
    when(listar.executar()).thenReturn(List.of(repo("AA-Space")));
    GerarSitemapUseCase uc = new GerarSitemapUseCase(listar, site);

    String xml = uc.gerarSitemap();

    assertThat(xml).contains("<loc>https://meu-site.dev/</loc>");
    assertThat(xml).contains("<loc>https://meu-site.dev/projects/aa-space</loc>");
    assertThat(xml).contains("hreflang=\"en\" href=\"https://meu-site.dev/en/projects/aa-space\"");
  }

  @Test
  void robots_deveBloquearApiEApontarSitemap() {
    ListarProjetosGithubUseCase listar = mock(ListarProjetosGithubUseCase.class);
    GerarSitemapUseCase uc = new GerarSitemapUseCase(listar, site);

    String robots = uc.gerarRobots();

    assertThat(robots).contains("Disallow: /api/");
    assertThat(robots).contains("Sitemap: https://meu-site.dev/sitemap.xml");
  }

  private GithubRepositoryDto repo(String nome) {
    return new GithubRepositoryDto(1L, nome, "wmakeouthill/" + nome, "Descricao do projeto",
        "https://github.com/wmakeouthill/" + nome, null, 5, 1, "Java",
        List.of(), "2024-01-01", "2024-02-01", "2024-03-01", false, List.of(), 1000L);
  }
}
