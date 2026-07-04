package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CaseDto;
import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ListarCasesUseCaseTest {

  private final GithubRepositoryContentPort port = mock(GithubRepositoryContentPort.class);
  private final ListarCasesUseCase useCase = new ListarCasesUseCase(port, new CaseFrontmatterParser());

  @Test
  void executar_deveOrdenarFreelaAntesDeAutouEPorOrder() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("itau-demo", "portfolio-content/cases/autou/itau-demo.md"),
        md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md"),
        md("aog-dux-truck", "portfolio-content/cases/freelas/aog-dux-truck.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/autou/itau-demo.md"))
        .thenReturn(Optional.of(caseMd("Itaú demo", "autou", 9)));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/mercearia-rv.md"))
        .thenReturn(Optional.of(caseMd("Mercearia R&V", "freela", 9)));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/aog-dux-truck.md"))
        .thenReturn(Optional.of(caseMd("AOG", "freela", 2)));

    List<CaseDto> cases = useCase.executar("pt");

    assertThat(cases).extracting(CaseDto::slug)
        .containsExactly("aog-dux-truck", "mercearia-rv", "itau-demo");
  }

  @Test
  void executar_emIngles_devePreferirVarianteEnglishEFazerFallbackPt() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md"),
        md("mercearia-rv-english", "portfolio-content/cases/freelas/mercearia-rv-english.md"),
        md("aog-dux-truck", "portfolio-content/cases/freelas/aog-dux-truck.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/mercearia-rv-english.md"))
        .thenReturn(Optional.of(caseMd("Mercearia R&V — Offline-first POS", "freela", 1)));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/aog-dux-truck.md"))
        .thenReturn(Optional.of(caseMd("AOG (só PT)", "freela", 2)));

    List<CaseDto> cases = useCase.executar("en");

    assertThat(cases).extracting(CaseDto::slug)
        .containsExactly("mercearia-rv", "aog-dux-truck");
    assertThat(cases.get(0).title()).contains("Offline-first POS");
  }

  @Test
  void executar_semFrontmatter_deveDerivarTituloDoSlugECategoriaDoPath() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("itau-demo", "portfolio-content/cases/autou/itau-demo.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/autou/itau-demo.md"))
        .thenReturn(Optional.of("# Case sem frontmatter\nCorpo."));

    List<CaseDto> cases = useCase.executar("pt");

    assertThat(cases).hasSize(1);
    assertThat(cases.get(0).title()).isEqualTo("Itau Demo");
    assertThat(cases.get(0).category()).isEqualTo("autou");
    assertThat(cases.get(0).client()).isNull();
  }

  @Test
  void executar_comGalleryAlias_deveResolverGaleriaCoverELogoPorConvencao() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md")));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/mercearia-rv.md"))
        .thenReturn(Optional.of("""
            ---
            title: Mercearia R&V
            category: freela
            gallery: mercearia-r-v
            ---
            corpo"""));
    when(port.listarGaleriaProjeto("mercearia-r-v")).thenReturn(List.of(
        midia("cover.png", "portfolio-gallery/mercearia-r-v/cover.png"),
        midia("logo.webp", "portfolio-gallery/mercearia-r-v/logo.webp"),
        midia("tela1.png", "portfolio-gallery/mercearia-r-v/tela1.png")));

    List<CaseDto> cases = useCase.executar("pt");

    CaseDto dto = cases.get(0);
    assertThat(dto.gallerySlug()).isEqualTo("mercearia-r-v");
    assertThat(dto.hasGallery()).isTrue();
    assertThat(dto.coverUrl()).endsWith("mercearia-r-v/cover.png");
    assertThat(dto.logoUrl()).endsWith("mercearia-r-v/logo.webp");
  }

  @Test
  void executar_comApenasLogo_deveUsarLogoComoCoverPlaceholder() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("saint-gobain-replica-ai", "portfolio-content/cases/autou/saint-gobain-replica-ai.md")));
    when(port.obterMarkdownConteudo("portfolio-content/cases/autou/saint-gobain-replica-ai.md"))
        .thenReturn(Optional.of("""
            ---
            title: Réplica AI
            client: Saint-Gobain
            category: autou
            ---
            corpo"""));
    when(port.listarGaleriaProjeto("saint-gobain-replica-ai")).thenReturn(List.of(
        midia("logo.svg", "portfolio-gallery/saint-gobain-replica-ai/logo.svg")));

    List<CaseDto> cases = useCase.executar("pt");

    CaseDto dto = cases.get(0);
    assertThat(dto.logoUrl()).endsWith("saint-gobain-replica-ai/logo.svg");
    assertThat(dto.coverUrl()).isEqualTo(dto.logoUrl());
    assertThat(dto.hasGallery()).isTrue();
  }

  @Test
  void executar_caseDeEstudo_deveFicarForaDaAbaProfissional() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("notas-vue-spring", "portfolio-content/cases/freelas/notas-vue-spring.md"),
        md("aog-dux-truck", "portfolio-content/cases/freelas/aog-dux-truck.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/notas-vue-spring.md"))
        .thenReturn(Optional.of("""
            ---
            title: App de anotações
            category: freela
            status: Estudo
            order: 8
            ---
            corpo"""));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/aog-dux-truck.md"))
        .thenReturn(Optional.of(caseMd("AOG", "freela", 2)));

    List<CaseDto> cases = useCase.executar("pt");

    assertThat(cases).extracting(CaseDto::slug).containsExactly("aog-dux-truck");
  }

  @Test
  void executar_semGaleria_deveDevolverHasGalleryFalseEUrlsNulas() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("itau-demo", "portfolio-content/cases/autou/itau-demo.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/autou/itau-demo.md"))
        .thenReturn(Optional.of("corpo"));

    List<CaseDto> cases = useCase.executar("pt");

    assertThat(cases.get(0).hasGallery()).isFalse();
    assertThat(cases.get(0).coverUrl()).isNull();
    assertThat(cases.get(0).logoUrl()).isNull();
  }

  private RepositoryFileDto md(String nome, String path) {
    return new RepositoryFileDto(nome + ".md", nome, path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + nome, "file");
  }

  private RepositoryFileDto midia(String arquivo, String path) {
    return new RepositoryFileDto(arquivo, arquivo.substring(0, arquivo.lastIndexOf('.')), path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + arquivo, "file");
  }

  private String caseMd(String title, String category, int order) {
    return "---\ntitle: " + title + "\ncategory: " + category + "\norder: " + order + "\n---\ncorpo";
  }
}
