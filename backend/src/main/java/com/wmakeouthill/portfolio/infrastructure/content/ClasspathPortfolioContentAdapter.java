package com.wmakeouthill.portfolio.infrastructure.content;

import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Adapter de infraestrutura que lê arquivos markdown do classpath
 * em {@code src/main/resources/portfolio-content/*.md}.
 */
@Slf4j
@Component
public class ClasspathPortfolioContentAdapter implements PortfolioContentPort {

  private static final String MARKDOWN_LOCATION_PATTERN = "classpath*:portfolio-content/*.md";
  private static final String PROJECT_MARKDOWN_PATTERN = "classpath*:portfolio-content/projects/*.md";
  private static final String PROJECT_MARKDOWN_PATTERN_SINGLE = "classpath*:portfolio-content/projects/%s.md";
  private static final int MAX_CHARS_PER_FILE = 4000;

  private final PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

  @Override
  public List<String> carregarConteudosMarkdown() {
    return carregarMarkdownsDetalhados().stream()
        .map(PortfolioMarkdownResource::conteudo)
        .toList();
  }

  @Override
  public List<PortfolioMarkdownResource> carregarMarkdownsDetalhados() {
    List<PortfolioMarkdownResource> gerais = carregarRecursosGenericos();
    List<PortfolioMarkdownResource> projetos = carregarRecursosDeProjetos();
    log.info(
        "Carregados {} markdowns gerais e {} markdowns de projetos para contexto da IA (total: {})",
        gerais.size(), projetos.size(), gerais.size() + projetos.size());
    return unirListas(gerais, projetos);
  }

  @Override
  public Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado) {
    String location = PROJECT_MARKDOWN_PATTERN_SINGLE.formatted(nomeProjetoNormalizado);
    try {
      Resource[] resources = resolver.getResources(Objects.requireNonNull(location));
      if (resources.length == 0) {
        return Optional.empty();
      }
      String conteudo = lerRecursoComoTexto(resources[0]);
      if (conteudo.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(conteudo);
    } catch (IOException e) {
      log.warn("Não foi possível carregar markdown do projeto {}", nomeProjetoNormalizado, e);
      return Optional.empty();
    }
  }

  private List<PortfolioMarkdownResource> carregarRecursosGenericos() {
    List<PortfolioMarkdownResource> recursos = new ArrayList<>();
    try {
      for (Resource resource : resolver.getResources(MARKDOWN_LOCATION_PATTERN)) {
        if (!estaNaRaizPortfolio(resource)) {
          continue;
        }
        lerComoResource(resource, false).ifPresent(recursos::add);
      }
    } catch (IOException e) {
      log.warn("Não foi possível carregar markdowns gerais", e);
    }
    return recursos;
  }

  private List<PortfolioMarkdownResource> carregarRecursosDeProjetos() {
    List<PortfolioMarkdownResource> recursos = new ArrayList<>();
    try {
      for (Resource resource : resolver.getResources(PROJECT_MARKDOWN_PATTERN)) {
        lerComoResource(resource, true).ifPresent(recursos::add);
      }
    } catch (IOException e) {
      log.warn("Não foi possível carregar markdowns de projetos", e);
    }
    return recursos;
  }

  private Optional<PortfolioMarkdownResource> lerComoResource(Resource resource, boolean projeto) {
    try {
      String conteudo = lerRecursoComoTexto(resource);
      if (conteudo.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(new PortfolioMarkdownResource(
          extrairNome(resource),
          resource.getURI().toString(),
          limitadorDeTamanho(conteudo),
          projeto));
    } catch (Exception e) {
      log.debug("Erro ao processar recurso {}", resource, e);
      return Optional.empty();
    }
  }

  private boolean estaNaRaizPortfolio(Resource resource) throws IOException {
    String uri = resource.getURI().toString();
    return uri.contains("/portfolio-content/") && !uri.contains("/portfolio-content/projects/");
  }

  private String extrairNome(Resource resource) {
    String filename = resource.getFilename();
    if (filename == null || filename.isBlank()) {
      return "desconhecido";
    }
    int idx = filename.lastIndexOf('.');
    return idx > 0 ? filename.substring(0, idx) : filename;
  }

  private List<PortfolioMarkdownResource> unirListas(
      List<PortfolioMarkdownResource> gerais,
      List<PortfolioMarkdownResource> projetos
  ) {
    List<PortfolioMarkdownResource> todos = new ArrayList<>(gerais);
    todos.addAll(projetos);
    return todos;
  }

  private String lerRecursoComoTexto(Resource resource) throws IOException {
    try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
      StringBuilder builder = new StringBuilder();
      String linha;
      while ((linha = reader.readLine()) != null) {
        builder.append(linha).append(System.lineSeparator());
      }
      return builder.toString();
    }
  }

  private String limitadorDeTamanho(String conteudo) {
    if (conteudo.length() <= MAX_CHARS_PER_FILE) {
      return conteudo;
    }
    return conteudo.substring(0, MAX_CHARS_PER_FILE);
  }
}
