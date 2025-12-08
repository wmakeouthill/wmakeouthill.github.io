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
import java.util.LinkedHashMap;
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
  private static final String ENGLISH_SUFFIX = "-english";

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
      Map.entry("wmakeouthill.github.io",
          metadata(false, Set.of("projeto", "portfolio", "site", "angular", "spring boot"))),
      Map.entry("wmakeouthill", metadata(false, Set.of("projeto", "perfil", "github", "wesley"))),
      Map.entry("anbima-selic-banco-central",
          metadata(false, Set.of("experiencia", "trabalho", "emprego", "anbima", "selic", "banco central"))),
      Map.entry("gondim-albuquerque-negreiros",
          metadata(false, Set.of("experiencia", "trabalho", "emprego", "juridico", "advocacia"))),
      Map.entry("liquigas-petrobras",
          metadata(false, Set.of("experiencia", "trabalho", "emprego", "liquigas", "petrobras"))),
      Map.entry("phillip-morris",
          metadata(false, Set.of("experiencia", "trabalho", "emprego", "phillip morris", "tabaco"))));

  private final GithubRepositoryContentPort githubContentPort;

  @Override
  public List<String> carregarConteudosMarkdown() {
    return carregarMarkdownsDetalhados().stream()
        .map(PortfolioMarkdownResource::conteudo)
        .toList();
  }

  @Override
  public List<PortfolioMarkdownResource> carregarMarkdownsDetalhados() {
    return carregarMarkdownsDetalhados("pt");
  }

  @Override
  public List<PortfolioMarkdownResource> carregarMarkdownsDetalhados(String language) {
    List<PortfolioMarkdownResource> recursos = new ArrayList<>();
    boolean english = isEnglish(language);

    // Carrega markdowns gerais (raiz do portfolio-content)
    List<RepositoryFileDto> docsGerais = filtrarPorIdioma(
        githubContentPort.listarDocumentacoes().stream()
            .filter(doc -> !doc.path().contains("/projects/") && !doc.path().contains("/trabalhos/"))
            .toList(),
        english);

    for (RepositoryFileDto doc : docsGerais) {
      converterParaResource(doc, false).ifPresent(recursos::add);
    }

    // Carrega markdowns de projetos
    for (RepositoryFileDto doc : filtrarPorIdioma(githubContentPort.listarDocumentacoesProjetos(), english)) {
      converterParaResource(doc, true).ifPresent(recursos::add);
    }

    // Carrega markdowns de trabalhos (também são projetos/experiências)
    for (RepositoryFileDto doc : filtrarPorIdioma(githubContentPort.listarDocumentacoesTrabalhos(), english)) {
      converterParaResource(doc, true).ifPresent(recursos::add);
    }

    log.info("Carregados {} markdowns do GitHub para contexto da IA (lang={})", recursos.size(), english ? "en" : "pt");
    return recursos;
  }

  @Override
  public Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado) {
    return carregarMarkdownPorProjeto(nomeProjetoNormalizado, "pt");
  }

  @Override
  public Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado, String language) {
    log.debug("Buscando markdown para projeto: {} (lang={})", nomeProjetoNormalizado, language);
    boolean english = isEnglish(language);

    // Primeiro, tenta encontrar o arquivo exato na lista de projetos
    Optional<String> conteudoPorLista = buscarMarkdownNaLista(nomeProjetoNormalizado, english);
    if (conteudoPorLista.isPresent()) {
      return conteudoPorLista;
    }

    // Fallback: tenta path direto (case-sensitive) respeitando sufixo
    String pathProjeto = "portfolio-content/projects/" + nomeProjetoNormalizado + (english ? ENGLISH_SUFFIX : "")
        + ".md";
    String pathTrabalho = "portfolio-content/trabalhos/" + nomeProjetoNormalizado + (english ? ENGLISH_SUFFIX : "")
        + ".md";

    log.debug("Tentando path direto: {}", pathProjeto);
    Optional<String> conteudo = githubContentPort.obterMarkdownConteudo(pathProjeto);
    if (conteudo.isPresent()) {
      return conteudo;
    }

    log.debug("Tentando path trabalhos: {}", pathTrabalho);
    conteudo = githubContentPort.obterMarkdownConteudo(pathTrabalho);
    if (conteudo.isPresent()) {
      return conteudo;
    }

    // Último fallback: se idioma é EN e não achou variante traduzida, tenta padrão
    if (english) {
      log.debug("Fallback para versão padrão (pt) para projeto {}", nomeProjetoNormalizado);
      return carregarMarkdownPorProjeto(nomeProjetoNormalizado, "pt");
    }

    return Optional.empty();
  }

  /**
   * Busca o markdown na lista de arquivos do repositório (case-insensitive).
   */
  private Optional<String> buscarMarkdownNaLista(String nomeProjeto, boolean english) {
    String nomeNormalizado = nomeProjeto.toLowerCase(Locale.ROOT);

    // Busca em projetos
    for (RepositoryFileDto doc : filtrarPorIdioma(githubContentPort.listarDocumentacoesProjetos(), english)) {
      if (baseName(doc.displayName()).equals(nomeNormalizado)) {
        log.debug("Encontrado em projetos: {} -> {}", nomeProjeto, doc.path());
        return githubContentPort.obterMarkdownConteudo(doc.path());
      }
    }

    // Busca em trabalhos
    for (RepositoryFileDto doc : filtrarPorIdioma(githubContentPort.listarDocumentacoesTrabalhos(), english)) {
      if (baseName(doc.displayName()).equals(nomeNormalizado)) {
        log.debug("Encontrado em trabalhos: {} -> {}", nomeProjeto, doc.path());
        return githubContentPort.obterMarkdownConteudo(doc.path());
      }
    }

    log.debug("Não encontrado na lista: {}", nomeProjeto);
    return Optional.empty();
  }

  private Optional<PortfolioMarkdownResource> converterParaResource(RepositoryFileDto doc, boolean projeto) {
    Optional<String> conteudoOpt = githubContentPort.obterMarkdownConteudo(doc.path());
    if (conteudoOpt.isEmpty() || conteudoOpt.get().isBlank()) {
      return Optional.empty();
    }

    String conteudo = limitarTamanho(conteudoOpt.get());
    String nomeBase = baseName(doc.displayName());
    MarkdownMetadata metadata = obterMetadata(nomeBase, projeto);

    return Optional.of(new PortfolioMarkdownResource(
        nomeBase,
        doc.path(),
        conteudo,
        projeto,
        metadata.preferencialFallback(),
        metadata.tags()));
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

  private List<RepositoryFileDto> filtrarPorIdioma(List<RepositoryFileDto> docs, boolean english) {
    Map<String, RepositoryFileDto> escolhidos = new LinkedHashMap<>();
    for (RepositoryFileDto doc : docs) {
      String base = baseName(doc.displayName());
      boolean isEnglish = doc.displayName().toLowerCase(Locale.ROOT).endsWith(ENGLISH_SUFFIX);
      RepositoryFileDto atual = escolhidos.get(base);
      if (atual == null) {
        escolhidos.put(base, doc);
        continue;
      }
      if (english && isEnglish) {
        escolhidos.put(base, doc);
      } else if (!english && !isEnglish) {
        escolhidos.put(base, doc);
      }
    }
    return new ArrayList<>(escolhidos.values());
  }

  private boolean isEnglish(String language) {
    if (language == null)
      return false;
    String lower = language.toLowerCase(Locale.ROOT);
    return lower.startsWith("en");
  }

  private String baseName(String displayName) {
    String lower = displayName.toLowerCase(Locale.ROOT);
    if (lower.endsWith(ENGLISH_SUFFIX)) {
      return lower.substring(0, lower.length() - ENGLISH_SUFFIX.length());
    }
    return lower;
  }

  private static MarkdownMetadata metadata(boolean preferencialFallback, Set<String> tags) {
    return new MarkdownMetadata(preferencialFallback, tags);
  }

  private record MarkdownMetadata(boolean preferencialFallback, Set<String> tags) {
  }
}
