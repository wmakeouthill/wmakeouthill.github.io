package com.wmakeouthill.portfolio.infrastructure.content;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GithubPortfolioMarkdownAdapterCasesTest {

  private static final String CASE_PATH = "portfolio-content/cases/freelas/mercearia-rv.md";
  private static final String CASE_MD = """
      ---
      title: Mercearia R&V — PDV desktop offline-first
      client: Mercearia R&V
      category: freela
      status: Produção
      stack: [Java 21, Electron]
      order: 9
      ---
      # Case — Mercearia R&V

      Corpo do case.
      """;

  private final GithubRepositoryContentPort port = mock(GithubRepositoryContentPort.class);
  private final GithubPortfolioMarkdownAdapter adapter = new GithubPortfolioMarkdownAdapter(
      port, new CaseMarkdownSupport(new CaseFrontmatterParser()));

  @Test
  void carregarMarkdownsDetalhados_deveIncluirCaseComoProjetoComTagsESemFrontmatter() {
    when(port.listarDocumentacoes()).thenReturn(List.of());
    when(port.listarDocumentacoesProjetos()).thenReturn(List.of());
    when(port.listarDocumentacoesTrabalhos()).thenReturn(List.of());
    when(port.listarDocumentacoesCases()).thenReturn(List.of(md("mercearia-rv", CASE_PATH)));
    when(port.obterMarkdownConteudo(CASE_PATH)).thenReturn(Optional.of(CASE_MD));

    List<PortfolioMarkdownResource> recursos = adapter.carregarMarkdownsDetalhados("pt");

    assertThat(recursos).hasSize(1);
    PortfolioMarkdownResource recurso = recursos.get(0);
    assertThat(recurso.projeto()).isTrue();
    assertThat(recurso.conteudo()).startsWith("# Case — Mercearia R&V");
    assertThat(recurso.conteudo()).doesNotContain("title:");
    assertThat(recurso.tags()).contains("case", "freela", "mercearia r&v", "java 21", "mercearia");
  }

  @Test
  void carregarMarkdownPorProjeto_deveResolverSlugDeCaseSemFrontmatter() {
    when(port.listarDocumentacoesProjetos()).thenReturn(List.of());
    when(port.listarDocumentacoesTrabalhos()).thenReturn(List.of());
    when(port.listarDocumentacoesCases()).thenReturn(List.of(md("mercearia-rv", CASE_PATH)));
    when(port.obterMarkdownConteudo(CASE_PATH)).thenReturn(Optional.of(CASE_MD));

    Optional<String> conteudo = adapter.carregarMarkdownPorProjeto("mercearia-rv", "pt");

    assertThat(conteudo).isPresent();
    assertThat(conteudo.get()).startsWith("# Case — Mercearia R&V");
    assertThat(conteudo.get()).doesNotContain("---");
  }

  @Test
  void carregarMarkdownPorProjeto_deveOcultarSecaoStarNaExibicaoPublica() {
    String caseComStar = CASE_MD + """

        ## Destaques para entrevista (STAR resumido)

        - **S/T:** nota privada.
        """;
    when(port.listarDocumentacoesProjetos()).thenReturn(List.of());
    when(port.listarDocumentacoesTrabalhos()).thenReturn(List.of());
    when(port.listarDocumentacoesCases()).thenReturn(List.of(md("mercearia-rv", CASE_PATH)));
    when(port.obterMarkdownConteudo(CASE_PATH)).thenReturn(Optional.of(caseComStar));

    Optional<String> publico = adapter.carregarMarkdownPorProjeto("mercearia-rv", "pt");

    assertThat(publico).isPresent();
    assertThat(publico.get()).doesNotContain("Destaques para entrevista");
    assertThat(publico.get()).doesNotContain("nota privada");
  }

  @Test
  void listarNomesProjetosComMarkdown_deveIncluirCases() {
    when(port.listarDocumentacoesProjetos()).thenReturn(List.of());
    when(port.listarDocumentacoesTrabalhos()).thenReturn(List.of());
    when(port.listarDocumentacoesCases()).thenReturn(List.of(md("mercearia-rv", CASE_PATH)));

    assertThat(adapter.listarNomesProjetosComMarkdown()).contains("mercearia-rv");
  }

  private RepositoryFileDto md(String nome, String path) {
    return new RepositoryFileDto(nome + ".md", nome, path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + nome, "file");
  }
}
