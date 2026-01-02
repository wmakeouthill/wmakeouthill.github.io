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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Adapter de infraestrutura que lê arquivos markdown do classpath
 * em {@code src/main/resources/portfolio-content/*.md}.
 * 
 * @deprecated Substituído por {@link GithubPortfolioMarkdownAdapter} que busca
 *             conteúdo dinamicamente do repositório GitHub.
 */
@Slf4j
@Component
@Deprecated
public class ClasspathPortfolioContentAdapter implements PortfolioContentPort {

  private static final String MARKDOWN_LOCATION_PATTERN = "classpath*:portfolio-content/*.md";
  private static final String PROJECT_MARKDOWN_PATTERN = "classpath*:portfolio-content/projects/*.md";
  private static final String PROJECT_MARKDOWN_PATTERN_SINGLE = "classpath*:portfolio-content/projects/%s.md";
  private static final int MAX_CHARS_PER_FILE = 4000;
  private static final Map<String, MarkdownMetadata> METADADOS = Map.ofEntries(
      Map.entry("curriculo", metadata(true, Set.of("curriculo", "perfil", "experiencia", "contato"))),
      Map.entry("stacks", metadata(true, Set.of("stack", "tecnologias", "skills"))),
      Map.entry("readme", metadata(false, Set.of("portfolio", "resumo"))),
      Map.entry("readme_github_profile", metadata(false, Set.of("perfil", "github"))),
      Map.entry("aa_space", metadata(false, Set.of("projeto", "aa space", "comunidade"))),
      Map.entry("experimenta-ai---soneca", metadata(false, Set.of("projeto", "lanchonete", "clean architecture"))),
      Map.entry("first-angular-app", metadata(false, Set.of("projeto", "angular", "iniciante"))),
      Map.entry("investment_calculator", metadata(false, Set.of("projeto", "investimento", "calculadora"))),
      Map.entry("lobby-pedidos", metadata(false, Set.of("projeto", "pedidos", "automacao"))),
      Map.entry("lol-matchmaking-fazenda", metadata(false, Set.of("projeto", "lol", "matchmaking"))),
      Map.entry("mercearia-r-v", metadata(false, Set.of("projeto", "varejo", "estoque"))),
      Map.entry("obaid-with-bro", metadata(false, Set.of("projeto", "chatbot", "obaid"))),
      Map.entry("pintarapp", metadata(false, Set.of("projeto", "pintura", "app"))),
      Map.entry("traffic_manager", metadata(false, Set.of("projeto", "dashboard", "tempo real"))),
      Map.entry("anbima-selic-banco-central", metadata(false, Set.of("experiencia", "anbima", "selic"))),
      Map.entry("gondim-albuquerque-negreiros", metadata(false, Set.of("experiencia", "juridico"))),
      Map.entry("liquigas-petrobras", metadata(false, Set.of("experiencia", "liquigas"))),
      Map.entry("phillip-morris", metadata(false, Set.of("experiencia", "phillip morris"))));

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
      String nome = extrairNome(resource);
      MarkdownMetadata metadata = metadataPara(nome, projeto);
      return Optional.of(new PortfolioMarkdownResource(
          nome,
          resource.getURI().toString(),
          limitadorDeTamanho(conteudo),
          projeto,
          metadata.preferencialFallback(),
          metadata.tags()));
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
      List<PortfolioMarkdownResource> projetos) {
    List<PortfolioMarkdownResource> todos = new ArrayList<>(gerais);
    todos.addAll(projetos);
    return todos;
  }

  private MarkdownMetadata metadataPara(String nome, boolean projeto) {
    String chave = nome.toLowerCase(Locale.ROOT);
    MarkdownMetadata metadata = METADADOS.get(chave);
    if (metadata != null) {
      return metadata;
    }
    Set<String> tags = projeto
        ? Set.of("projeto", chave)
        : Set.of("portfolio", chave);
    return new MarkdownMetadata(false, tags);
  }

  private static MarkdownMetadata metadata(boolean preferencialFallback, Set<String> tags) {
    return new MarkdownMetadata(preferencialFallback, tags);
  }

  private record MarkdownMetadata(boolean preferencialFallback, Set<String> tags) {
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
