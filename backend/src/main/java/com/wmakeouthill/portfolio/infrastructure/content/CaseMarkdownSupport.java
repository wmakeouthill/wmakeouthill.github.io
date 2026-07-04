package com.wmakeouthill.portfolio.infrastructure.content;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatter;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.UnaryOperator;

/**
 * Converte cases profissionais (markdown com frontmatter) em recursos de RAG:
 * corpo sem o bloco YAML e tags derivadas de client/category/stack para o tag
 * boost do ContextSearchService (ex.: "projeto da Libbs" acha o case da LIS).
 *
 * <p>Centraliza toda a leitura de cases para manter o
 * {@link GithubPortfolioMarkdownAdapter} enxuto (abaixo de 300 linhas). A
 * normalização de nome é injetada pelo adapter ({@code baseName}) para não
 * duplicar essa lógica.
 */
@Component
@RequiredArgsConstructor
public class CaseMarkdownSupport {

  private final CaseFrontmatterParser parser;

  /** Lê e converte todos os cases (já filtrados por idioma) em recursos de RAG. */
  public List<PortfolioMarkdownResource> carregarRecursos(
      GithubRepositoryContentPort port, List<RepositoryFileDto> docs,
      UnaryOperator<String> baseName, int maxChars) {
    List<PortfolioMarkdownResource> recursos = new ArrayList<>();
    for (RepositoryFileDto doc : docs) {
      port.obterMarkdownConteudo(doc.path())
          .flatMap(conteudo -> converter(doc, conteudo, baseName.apply(doc.displayName()), maxChars))
          .ifPresent(recursos::add);
    }
    return recursos;
  }

  /** Busca o corpo (sem frontmatter) de um case cujo slug bate com {@code slug}. */
  public Optional<String> buscarPorSlug(
      GithubRepositoryContentPort port, List<RepositoryFileDto> docs,
      UnaryOperator<String> baseName, String slug) {
    for (RepositoryFileDto doc : docs) {
      if (baseName.apply(doc.displayName()).equals(slug)) {
        return port.obterMarkdownConteudo(doc.path()).map(this::removerFrontmatter);
      }
    }
    return Optional.empty();
  }

  public Optional<PortfolioMarkdownResource> converter(
      RepositoryFileDto doc, String conteudo, String nomeBase, int maxChars) {
    if (conteudo == null || conteudo.isBlank()) {
      return Optional.empty();
    }
    CaseFrontmatter fm = parser.extrair(conteudo);
    String corpo = fm.corpo();
    if (corpo.isBlank()) {
      return Optional.empty();
    }
    String limitado = corpo.length() > maxChars ? corpo.substring(0, maxChars) : corpo;
    return Optional.of(new PortfolioMarkdownResource(
        nomeBase, doc.path(), limitado, true, false, tagsDe(fm, nomeBase, doc.path())));
  }

  public String removerFrontmatter(String conteudo) {
    return parser.extrair(conteudo).corpo();
  }

  /** Fallback por path direto (freelas/autou); devolve o primeiro corpo (sem frontmatter) achado. */
  public Optional<String> buscarPorPath(
      GithubRepositoryContentPort port, String nomeNormalizado, boolean english) {
    for (String pathCase : caminhosDiretos(nomeNormalizado, english)) {
      Optional<String> corpo = port.obterMarkdownConteudo(pathCase).map(this::removerFrontmatter);
      if (corpo.isPresent()) {
        return corpo;
      }
    }
    return Optional.empty();
  }

  /** Caminhos diretos possíveis de um case, para o fallback por path do adapter. */
  public List<String> caminhosDiretos(String nomeNormalizado, boolean english) {
    String sufixo = english ? "-english" : "";
    return List.of(
        "portfolio-content/cases/freelas/" + nomeNormalizado + sufixo + ".md",
        "portfolio-content/cases/autou/" + nomeNormalizado + sufixo + ".md");
  }

  private Set<String> tagsDe(CaseFrontmatter fm, String nomeBase, String path) {
    Set<String> tags = new HashSet<>();
    tags.add("projeto");
    tags.add("case");
    tags.add("profissional");
    tags.add(nomeBase);
    tags.add(nomeBase.replace("-", " ").replace("_", " "));
    for (String parte : nomeBase.split("[-_]+")) {
      if (parte.length() > 2) {
        tags.add(parte.toLowerCase(Locale.ROOT));
      }
    }
    String categoria = fm.category() != null ? fm.category()
        : (path.contains("/autou/") ? "autou" : "freela");
    tags.add(categoria);
    if ("freela".equals(categoria)) {
      tags.add("freelance");
    }
    if (fm.client() != null) {
      String cliente = fm.client().toLowerCase(Locale.ROOT);
      tags.add(cliente);
      for (String parte : cliente.split("[\\s(—–-]+")) {
        if (parte.length() > 2) {
          tags.add(parte);
        }
      }
    }
    for (String tecnologia : fm.stack()) {
      tags.add(tecnologia.toLowerCase(Locale.ROOT));
    }
    return tags;
  }
}
