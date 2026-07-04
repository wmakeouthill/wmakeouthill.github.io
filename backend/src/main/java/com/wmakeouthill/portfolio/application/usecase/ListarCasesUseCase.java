package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CaseDto;
import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.infrastructure.config.CaffeineCacheConfig;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatter;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Lista os cases profissionais (freelas + AutoU) como cards para a aba
 * Profissionais. Metadados vêm do frontmatter YAML; case sem frontmatter
 * entra com título derivado do slug e categoria derivada da pasta (warning),
 * nunca derruba a listagem. Galeria/cover/logo resolvidos pela convenção
 * portfolio-gallery/<gallerySlug>/ (cover.* e logo.*).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListarCasesUseCase {

  private static final String ENGLISH_SUFFIX = "-english";

  private final GithubRepositoryContentPort contentPort;
  private final CaseFrontmatterParser frontmatterParser;

  @Cacheable(cacheNames = CaffeineCacheConfig.CACHE_GITHUB_DATA, key = "'cases:' + #language")
  public List<CaseDto> executar(String language) {
    boolean english = language != null && language.toLowerCase(Locale.ROOT).startsWith("en");
    List<CaseDto> cases = new ArrayList<>();
    for (RepositoryFileDto doc : filtrarPorIdioma(contentPort.listarDocumentacoesCases(), english)) {
      montarCase(doc).ifPresent(cases::add);
    }
    cases.sort(Comparator
        .comparing((CaseDto c) -> "autou".equals(c.category()) ? 1 : 0)
        .thenComparing(c -> c.order() == null ? Integer.MAX_VALUE : c.order())
        .thenComparing(CaseDto::slug));
    return cases;
  }

  private Optional<CaseDto> montarCase(RepositoryFileDto doc) {
    Optional<String> conteudo = contentPort.obterMarkdownConteudo(doc.path());
    if (conteudo.isEmpty() || conteudo.get().isBlank()) {
      return Optional.empty();
    }
    CaseFrontmatter fm = frontmatterParser.extrair(conteudo.get());
    String slug = baseName(doc.displayName());
    if (fm.title() == null) {
      log.warn("Case {} sem frontmatter válido; usando metadados derivados do nome", doc.path());
    }
    String categoria = fm.category() != null ? fm.category()
        : (doc.path().contains("/autou/") ? "autou" : "freela");
    String gallerySlug = fm.gallery() != null ? fm.gallery() : slug;
    List<RepositoryFileDto> galeria = contentPort.listarGaleriaProjeto(gallerySlug);
    return Optional.of(new CaseDto(
        slug,
        fm.title() != null ? fm.title() : humanizar(slug),
        fm.client(),
        categoria,
        fm.status(),
        fm.stack(),
        resolverMidia(galeria, fm.cover(), "cover."),
        resolverMidia(galeria, fm.logo(), "logo."),
        !galeria.isEmpty(),
        gallerySlug,
        fm.order()));
  }

  /** Prioriza o nome do frontmatter; sem ele, convenção cover.* / logo.* na galeria. */
  private String resolverMidia(List<RepositoryFileDto> galeria, String nomePreferido, String prefixo) {
    for (RepositoryFileDto arquivo : galeria) {
      String nome = arquivo.fileName().toLowerCase(Locale.ROOT);
      if (nomePreferido != null ? nome.equalsIgnoreCase(nomePreferido) : nome.startsWith(prefixo)) {
        return arquivo.downloadUrl();
      }
    }
    return null;
  }

  /** Mesma regra de idioma do GithubPortfolioMarkdownAdapter (sufixo -english + fallback PT). */
  private List<RepositoryFileDto> filtrarPorIdioma(List<RepositoryFileDto> docs, boolean english) {
    Map<String, RepositoryFileDto> escolhidos = new LinkedHashMap<>();
    for (RepositoryFileDto doc : docs) {
      String base = baseName(doc.displayName());
      boolean isEnglish = doc.displayName().toLowerCase(Locale.ROOT).endsWith(ENGLISH_SUFFIX);
      RepositoryFileDto atual = escolhidos.get(base);
      if (atual == null || (english == isEnglish)) {
        escolhidos.put(base, doc);
      }
    }
    return new ArrayList<>(escolhidos.values());
  }

  private String baseName(String displayName) {
    String lower = displayName.toLowerCase(Locale.ROOT);
    return lower.endsWith(ENGLISH_SUFFIX)
        ? lower.substring(0, lower.length() - ENGLISH_SUFFIX.length())
        : lower;
  }

  private String humanizar(String slug) {
    StringBuilder sb = new StringBuilder();
    for (String parte : slug.split("[-_]+")) {
      if (parte.isBlank()) {
        continue;
      }
      if (sb.length() > 0) {
        sb.append(' ');
      }
      sb.append(Character.toUpperCase(parte.charAt(0))).append(parte.substring(1));
    }
    return sb.toString();
  }
}
