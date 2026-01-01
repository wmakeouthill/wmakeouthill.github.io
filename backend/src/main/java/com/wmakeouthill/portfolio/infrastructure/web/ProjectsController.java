package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.FileContentDto;
import com.wmakeouthill.portfolio.application.dto.GithubProfileDto;
import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.dto.LanguageShareDto;
import com.wmakeouthill.portfolio.application.dto.RepoTreeResponse;
import com.wmakeouthill.portfolio.application.port.out.GithubProjectsPort;
import com.wmakeouthill.portfolio.application.usecase.ListarProjetosGithubUseCase;
import com.wmakeouthill.portfolio.application.usecase.ObterMarkdownProjetoUseCase;
import com.wmakeouthill.portfolio.infrastructure.translate.PortfolioTranslationOverrides;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectsController {

  private final ListarProjetosGithubUseCase listarProjetosGithubUseCase;
  private final ObterMarkdownProjetoUseCase obterMarkdownProjetoUseCase;
  private final GithubProjectsPort githubProjectsPort;
  private final PortfolioTranslationOverrides translationOverrides;

  /**
   * Lista todos os repositórios do usuário.
   * Cache: 30 minutos.
   */
  @GetMapping
  public ResponseEntity<List<GithubRepositoryDto>> listarProjetos(jakarta.servlet.http.HttpServletRequest request) {
    String language = extrairIdioma(request);
    log.info("Listando projetos do GitHub via backend autenticado (lang={})", language);
    List<GithubRepositoryDto> repositorios = translationOverrides.applyProjectOverrides(
        listarProjetosGithubUseCase.executar(),
        language);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(30, TimeUnit.MINUTES).cachePublic())
        .header("Vary", "X-Language,Accept-Language")
        .body(repositorios);
  }

  /**
   * Obtém o perfil do usuário no GitHub.
   * Cache: 30 minutos.
   */
  @GetMapping("/profile")
  public ResponseEntity<GithubProfileDto> obterPerfil() {
    log.info("Buscando perfil do GitHub via backend autenticado");
    return githubProjectsPort.buscarPerfil()
        .map(profile -> ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(30, TimeUnit.MINUTES).cachePublic())
            .body(profile))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Obtém as linguagens de um repositório específico.
   * Cache: 1 hora.
   */
  @GetMapping("/{repoName}/languages")
  public ResponseEntity<List<LanguageShareDto>> obterLinguagens(@PathVariable String repoName) {
    log.debug("Buscando linguagens do repositório: {}", repoName);
    List<LanguageShareDto> languages = githubProjectsPort.buscarLinguagensRepositorio(repoName);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
        .body(languages);
  }

  /**
   * Retorna estatísticas gerais do GitHub.
   * Cache: 30 minutos.
   */
  @GetMapping("/stats")
  public ResponseEntity<Map<String, Object>> obterEstatisticas() {
    log.info("Calculando estatísticas do GitHub");
    int totalStars = githubProjectsPort.contarTotalEstrelas();
    List<GithubRepositoryDto> repos = listarProjetosGithubUseCase.executar();

    Map<String, Object> stats = Map.of(
        "totalStars", totalStars,
        "totalRepositories", repos.size(),
        "totalForks", repos.stream().mapToInt(GithubRepositoryDto::forksCount).sum());

    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(30, TimeUnit.MINUTES).cachePublic())
        .body(stats);
  }

  /**
   * Retorna a árvore de arquivos de um repositório.
   * Cache: 1 hora.
   */
  @GetMapping("/{repoName}/tree")
  public ResponseEntity<RepoTreeResponse> obterArvore(@PathVariable String repoName) {
    log.debug("Buscando árvore do repositório: {}", repoName);
    var tree = githubProjectsPort.buscarArvoreRepositorio(repoName);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
        .body(new RepoTreeResponse(tree));
  }

  /**
   * Retorna o conteúdo de um arquivo específico do repositório.
   * Cache: 1 hora.
   */
  @GetMapping("/{repoName}/contents")
  public ResponseEntity<FileContentDto> obterConteudoArquivo(
      @PathVariable String repoName,
      @RequestParam String path) {
    log.debug("Buscando conteúdo do arquivo: {}/{}", repoName, path);
    return githubProjectsPort.buscarConteudoArquivo(repoName, path)
        .map(content -> ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
            .body(content))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Obtém o markdown de um projeto.
   * Usa regex no path para preservar nomes com pontos (ex:
   * wmakeouthill.github.io)
   */
  @GetMapping("/{projectName:.+}/markdown")
  public ResponseEntity<String> obterMarkdown(@PathVariable String projectName, HttpServletRequest request) {
    log.debug("Buscando markdown do projeto: {}", projectName);
    String language = extrairIdioma(request);
    return obterMarkdownProjetoUseCase.executar(projectName, language)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  private String extrairIdioma(jakarta.servlet.http.HttpServletRequest request) {
    String lang = request.getHeader("X-Language");
    if (lang == null || lang.isBlank()) {
      lang = request.getHeader("Accept-Language");
    }
    if (lang == null) {
      return "pt";
    }
    String lower = lang.toLowerCase();
    return lower.startsWith("en") ? "en" : "pt";
  }
}
