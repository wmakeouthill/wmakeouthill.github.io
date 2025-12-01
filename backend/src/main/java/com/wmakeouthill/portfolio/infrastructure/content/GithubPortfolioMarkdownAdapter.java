package com.wmakeouthill.portfolio.infrastructure.content;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Adapter que busca markdowns do repositório GitHub ao invés do classpath.
 * Substitui o ClasspathPortfolioContentAdapter para conteúdo dinâmico.
 */
@Slf4j
@Component
@Primary
@RequiredArgsConstructor
public class GithubPortfolioMarkdownAdapter implements PortfolioContentPort {

  private static final int MAX_CHARS_PER_FILE = 4000;

  private static final Map<String, MarkdownMetadata> METADADOS = Map.ofEntries(
      Map.entry("curriculo", metadata(true, Set.of("curriculo", "perfil", "experiencia", "trabalho", "contato"))),
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
      Map.entry("pinta-como-eu-pinto", metadata(false, Set.of("projeto", "arte", "pintura"))),
      Map.entry("pintarapp", metadata(false, Set.of("projeto", "pintura", "app"))),
      Map.entry("traffic_manager", metadata(false, Set.of("projeto", "dashboard", "tempo real"))),
      Map.entry("anbima-selic-banco-central", metadata(false, Set.of("experiencia", "trabalho", "emprego", "anbima", "selic", "banco central"))),
      Map.entry("gondim-albuquerque-negreiros", metadata(false, Set.of("experiencia", "trabalho", "emprego", "juridico", "advocacia"))),
      Map.entry("liquigas-petrobras", metadata(false, Set.of("experiencia", "trabalho", "emprego", "liquigas", "petrobras"))),
      Map.entry("phillip-morris", metadata(false, Set.of("experiencia", "trabalho", "emprego", "phillip morris", "tabaco")))
  );

  private final GithubRepositoryContentPort githubContentPort;

  @Override
  public List<String> carregarConteudosMarkdown() {
    return carregarMarkdownsDetalhados().stream()
        .map(PortfolioMarkdownResource::conteudo)
        .toList();
  }

  @Override
  public List<PortfolioMarkdownResource> carregarMarkdownsDetalhados() {
    List<PortfolioMarkdownResource> recursos = new ArrayList<>();

    // Carrega markdowns gerais (raiz do portfolio-content)
    List<RepositoryFileDto> docsGerais = githubContentPort.listarDocumentacoes().stream()
        .filter(doc -> !doc.path().contains("/projects/") && !doc.path().contains("/trabalhos/"))
        .toList();

    for (RepositoryFileDto doc : docsGerais) {
      converterParaResource(doc, false).ifPresent(recursos::add);
    }

    // Carrega markdowns de projetos
    for (RepositoryFileDto doc : githubContentPort.listarDocumentacoesProjetos()) {
      converterParaResource(doc, true).ifPresent(recursos::add);
    }

    // Carrega markdowns de trabalhos (também são projetos/experiências)
    for (RepositoryFileDto doc : githubContentPort.listarDocumentacoesTrabalhos()) {
      converterParaResource(doc, true).ifPresent(recursos::add);
    }

    log.info("Carregados {} markdowns do GitHub para contexto da IA", recursos.size());
    return recursos;
  }

  @Override
  public Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado) {
    String pathProjeto = "portfolio-content/projects/" + nomeProjetoNormalizado + ".md";
    String pathTrabalho = "portfolio-content/trabalhos/" + nomeProjetoNormalizado + ".md";

    // Tenta primeiro na pasta de projetos
    Optional<String> conteudo = githubContentPort.obterMarkdownConteudo(pathProjeto);
    if (conteudo.isPresent()) {
      return conteudo;
    }

    // Tenta na pasta de trabalhos
    return githubContentPort.obterMarkdownConteudo(pathTrabalho);
  }

  private Optional<PortfolioMarkdownResource> converterParaResource(RepositoryFileDto doc, boolean projeto) {
    Optional<String> conteudoOpt = githubContentPort.obterMarkdownConteudo(doc.path());
    if (conteudoOpt.isEmpty() || conteudoOpt.get().isBlank()) {
      return Optional.empty();
    }

    String conteudo = limitarTamanho(conteudoOpt.get());
    MarkdownMetadata metadata = obterMetadata(doc.displayName(), projeto);

    return Optional.of(new PortfolioMarkdownResource(
        doc.displayName(),
        doc.path(),
        conteudo,
        projeto,
        metadata.preferencialFallback(),
        metadata.tags()
    ));
  }

  private MarkdownMetadata obterMetadata(String nome, boolean projeto) {
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

  private String limitarTamanho(String conteudo) {
    if (conteudo.length() <= MAX_CHARS_PER_FILE) {
      return conteudo;
    }
    return conteudo.substring(0, MAX_CHARS_PER_FILE);
  }

  private static MarkdownMetadata metadata(boolean preferencialFallback, Set<String> tags) {
    return new MarkdownMetadata(preferencialFallback, tags);
  }

  private record MarkdownMetadata(boolean preferencialFallback, Set<String> tags) {
  }
}

