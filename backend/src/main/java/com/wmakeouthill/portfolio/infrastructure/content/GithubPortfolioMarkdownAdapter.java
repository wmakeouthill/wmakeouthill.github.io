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

  /**
   * Metadados estáticos APENAS para arquivos preferenciais (currículo, stacks).
   * Novos projetos são detectados dinamicamente do GitHub.
   */
  private static final Map<String, MarkdownMetadata> METADADOS_PREFERENCIAIS = Map.of(
      "curriculo", metadata(true, Set.of("curriculo", "perfil", "experiencia", "trabalho", "contato",
          "resume", "profile", "experience", "work", "contact")),
      "stacks", metadata(true, Set.of("stack", "tecnologias", "skills", "tech stack", "technologies")));

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

  /**
   * Obtém metadados para um arquivo.
   * Para arquivos preferenciais (currículo, stacks) usa metadados estáticos.
   * Para projetos, gera tags dinamicamente do nome do arquivo.
   */
  private MarkdownMetadata obterMetadata(String nome, boolean projeto) {
    String chave = nome.toLowerCase(Locale.ROOT);

    // Verifica se é arquivo preferencial (currículo, stacks)
    MarkdownMetadata preferencial = METADADOS_PREFERENCIAIS.get(chave);
    if (preferencial != null) {
      return preferencial;
    }

    // Gera tags dinamicamente do nome do projeto
    Set<String> tags = gerarTagsDinamicas(chave, projeto);
    return new MarkdownMetadata(false, tags);
  }

  /**
   * Gera tags automaticamente a partir do nome do projeto.
   * Ex: "lol-matchmaking-fazenda" → ["projeto", "lol", "matchmaking", "fazenda"]
   */
  private Set<String> gerarTagsDinamicas(String nome, boolean projeto) {
    Set<String> tags = new java.util.HashSet<>();

    // Tag base
    tags.add(projeto ? "projeto" : "portfolio");
    tags.add(nome);

    // Extrai palavras do nome (split por - e _)
    String[] partes = nome.split("[-_]+");
    for (String parte : partes) {
      if (parte.length() > 2) {
        tags.add(parte.toLowerCase(Locale.ROOT));
      }
    }

    // Versão sem separadores
    tags.add(nome.replace("-", "").replace("_", ""));

    // Versão com espaços (para busca natural)
    tags.add(nome.replace("-", " ").replace("_", " "));

    return tags;
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
