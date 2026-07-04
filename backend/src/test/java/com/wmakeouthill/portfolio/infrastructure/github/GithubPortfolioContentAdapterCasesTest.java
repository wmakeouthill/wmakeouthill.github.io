package com.wmakeouthill.portfolio.infrastructure.github;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GithubPortfolioContentAdapterCasesTest {

  private final GithubHttpClient httpClient = mock(GithubHttpClient.class);
  private final GithubContentCache cache = mock(GithubContentCache.class);
  private final GithubPortfolioContentAdapter adapter =
      new GithubPortfolioContentAdapter(httpClient, cache);

  @Test
  void listarDocumentacoesCases_deveJuntarFreelasEAutouOrdenadoPorPath() {
    when(cache.getFileList(anyString())).thenReturn(Optional.of(List.of()));
    when(cache.getFileList("list:portfolio-content/cases/freelas"))
        .thenReturn(Optional.of(List.of(md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md"))));
    when(cache.getFileList("list:portfolio-content/cases/autou"))
        .thenReturn(Optional.of(List.of(md("itau-demo", "portfolio-content/cases/autou/itau-demo.md"))));

    List<RepositoryFileDto> cases = adapter.listarDocumentacoesCases();

    assertThat(cases).extracting(RepositoryFileDto::path).containsExactly(
        "portfolio-content/cases/autou/itau-demo.md",
        "portfolio-content/cases/freelas/mercearia-rv.md");
  }

  @Test
  void listarDocumentacoes_deveIncluirIndexDosCasesComoDocumentoGeral() {
    when(cache.getFileList(anyString())).thenReturn(Optional.of(List.of()));
    when(cache.getFileList("list:portfolio-content/cases"))
        .thenReturn(Optional.of(List.of(md("INDEX", "portfolio-content/cases/INDEX.md"))));

    List<RepositoryFileDto> docs = adapter.listarDocumentacoes();

    assertThat(docs).extracting(RepositoryFileDto::path)
        .contains("portfolio-content/cases/INDEX.md");
  }

  private RepositoryFileDto md(String nome, String path) {
    return new RepositoryFileDto(nome + ".md", nome, path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + nome, "file");
  }
}
