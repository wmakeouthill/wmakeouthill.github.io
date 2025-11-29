package com.wmakeouthill.portfolio.infrastructure.content;

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
    List<String> conteudos = new ArrayList<>();

    try {
      // 1) Carrega markdowns gerais (portfolio-content/*.md) - apenas na raiz, não em subpastas
      Resource[] generalResources = resolver.getResources(MARKDOWN_LOCATION_PATTERN);
      int generalCount = 0;
      for (Resource resource : generalResources) {
        try {
          String uri = resource.getURI().toString();
          // Verifica se está na raiz de portfolio-content (não em subpastas como projects/)
          if (uri.contains("/portfolio-content/") && !uri.contains("/portfolio-content/projects/")) {
            String conteudo = lerRecursoComoTexto(resource);
            if (!conteudo.isBlank()) {
              conteudos.add(limitadorDeTamanho(conteudo));
              generalCount++;
            }
          }
        } catch (Exception e) {
          log.debug("Erro ao processar recurso {}", resource, e);
        }
      }

      // 2) Carrega TODOS os markdowns de projetos (portfolio-content/projects/*.md)
      Resource[] projectResources = resolver.getResources(PROJECT_MARKDOWN_PATTERN);
      int projectCount = 0;
      for (Resource resource : projectResources) {
        try {
          String conteudo = lerRecursoComoTexto(resource);
          if (!conteudo.isBlank()) {
            conteudos.add(limitadorDeTamanho(conteudo));
            projectCount++;
          }
        } catch (Exception e) {
          log.debug("Erro ao processar recurso de projeto {}", resource, e);
        }
      }

      log.info("Carregados {} markdowns gerais e {} markdowns de projetos para contexto da IA (total: {})", 
          generalCount, projectCount, conteudos.size());
    } catch (IOException e) {
      log.warn("Não foi possível carregar markdowns de portfolio-content", e);
    }

    return conteudos;
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
