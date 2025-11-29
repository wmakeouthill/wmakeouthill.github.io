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
import java.util.Optional;

/**
 * Adapter de infraestrutura que lê arquivos markdown do classpath
 * em {@code src/main/resources/portfolio-content/*.md}.
 */
@Slf4j
@Component
public class ClasspathPortfolioContentAdapter implements PortfolioContentPort {

  private static final String MARKDOWN_LOCATION_PATTERN = "classpath*:portfolio-content/*.md";
  private static final String PROJECT_MARKDOWN_PATTERN =
      "classpath*:portfolio-content/projects/%s.md";
  private static final int MAX_CHARS_PER_FILE = 4000;

  private final PathMatchingResourcePatternResolver resolver =
      new PathMatchingResourcePatternResolver();

  @Override
  public List<String> carregarConteudosMarkdown() {
    List<String> conteudos = new ArrayList<>();

    try {
      Resource[] resources = resolver.getResources(MARKDOWN_LOCATION_PATTERN);
      for (Resource resource : resources) {
        String conteudo = lerRecursoComoTexto(resource);
        if (!conteudo.isBlank()) {
          conteudos.add(limitadorDeTamanho(conteudo));
        }
      }
    } catch (IOException e) {
      log.warn("Não foi possível carregar markdowns de portfolio-content", e);
    }

    return conteudos;
  }

  @Override
  public Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado) {
    String location = PROJECT_MARKDOWN_PATTERN.formatted(nomeProjetoNormalizado);
    try {
      Resource[] resources = resolver.getResources(location);
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



