package com.wmakeouthill.portfolio.infrastructure.translate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;
import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.infrastructure.github.GithubHttpClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Carrega e aplica traduções sobrescritas para projetos e certificados.
 * Fonte: repo "certificados-wesley"/portfolio-translate/overrides.json.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PortfolioTranslationOverrides {

  private static final String REPO_NAME = "certificados-wesley";
  private static final String OVERRIDES_PATH = "portfolio-translate/overrides.json";
  private static final long CACHE_TTL_MS = Duration.ofMinutes(30).toMillis();

  private final GithubHttpClient githubHttpClient;
  private final ObjectMapper objectMapper = new ObjectMapper();

  private CacheEntry cache;

  public List<GithubRepositoryDto> applyProjectOverrides(List<GithubRepositoryDto> repos, String language) {
    if (!isEnglish(language) || repos == null || repos.isEmpty()) {
      return repos;
    }
    OverridesData overrides = loadOverrides();
    if (overrides.projectDescriptions().isEmpty()) {
      return repos;
    }

    return repos.stream()
        .map(repo -> {
          String override = overrides.projectDescriptions().get(normalize(repo.name()));
          if (override == null || override.isBlank()) {
            return repo;
          }
          log.debug("Override aplicado para projeto {} -> {}", repo.name(), override);
          return new GithubRepositoryDto(
              repo.id(),
              repo.name(),
              repo.fullName(),
              override,
              repo.htmlUrl(),
              repo.homepage(),
              repo.stargazersCount(),
              repo.forksCount(),
              repo.language(),
              repo.topics(),
              repo.createdAt(),
              repo.updatedAt(),
              repo.pushedAt(),
              repo.fork(),
              repo.languages(),
              repo.totalSizeBytes());
        })
        .toList();
  }

  public List<CertificadoPdfDto> applyCertificateOverrides(List<CertificadoPdfDto> certs, String language) {
    if (!isEnglish(language) || certs == null || certs.isEmpty()) {
      return certs;
    }
    OverridesData overrides = loadOverrides();
    if (overrides.certTitles().isEmpty()) {
      return certs;
    }
    return certs.stream()
        .map(cert -> applyCertificateOverride(cert, overrides))
        .toList();
  }

  public Optional<CertificadoPdfDto> applyCertificateOverride(Optional<CertificadoPdfDto> certOpt, String language) {
    if (certOpt.isEmpty() || !isEnglish(language)) {
      return certOpt;
    }
    OverridesData overrides = loadOverrides();
    if (overrides.certTitles().isEmpty()) {
      return certOpt;
    }
    return certOpt.map(cert -> applyCertificateOverride(cert, overrides));
  }

  private CertificadoPdfDto applyCertificateOverride(CertificadoPdfDto cert, OverridesData overrides) {
    String override = overrides.certTitles().get(normalize(cert.fileName()));
    if (override == null || override.isBlank()) {
      return cert;
    }
    log.debug("Override aplicado para certificado {} -> {}", cert.fileName(), override);
    return new CertificadoPdfDto(
        cert.fileName(),
        override,
        cert.downloadUrl(),
        cert.htmlUrl(),
        cert.size(),
        cert.sha());
  }

  private OverridesData loadOverrides() {
    if (cache != null && cache.isValid()) {
      return cache.data();
    }

    try {
      Optional<byte[]> raw = githubHttpClient.baixarArquivoRaw(REPO_NAME, OVERRIDES_PATH);
      if (raw.isEmpty()) {
        log.warn("overrides.json não encontrado em {}/{}", REPO_NAME, OVERRIDES_PATH);
        cache = CacheEntry.empty();
        return cache.data();
      }

      JsonNode root = objectMapper.readTree(raw.get());
      Map<String, String> projectDescriptions = parseProjectOverrides(root.path("projects"));
      Map<String, String> certTitles = parseCertOverrides(root.path("certs"));

      OverridesData data = new OverridesData(projectDescriptions, certTitles);
      cache = new CacheEntry(data, System.currentTimeMillis());
      log.info("Overrides carregados: {} projetos, {} certificados", projectDescriptions.size(), certTitles.size());
      return data;
    } catch (Exception e) {
      log.error("Erro ao carregar overrides de tradução", e);
      cache = CacheEntry.empty();
      return cache.data();
    }
  }

  private Map<String, String> parseProjectOverrides(JsonNode node) {
    if (node == null || !node.isObject()) {
      return Collections.emptyMap();
    }
    Map<String, String> result = new HashMap<>();
    node.fields().forEachRemaining(entry -> {
      JsonNode descNode = entry.getValue().path("description");
      if (descNode.isTextual()) {
        result.put(normalize(entry.getKey()), descNode.asText());
      }
    });
    return result;
  }

  private Map<String, String> parseCertOverrides(JsonNode node) {
    if (node == null || !node.isObject()) {
      return Collections.emptyMap();
    }
    Map<String, String> result = new HashMap<>();
    node.fields().forEachRemaining(entry -> {
      JsonNode titleNode = entry.getValue().path("title");
      if (titleNode.isTextual()) {
        result.put(normalize(entry.getKey()), titleNode.asText());
      }
    });
    return result;
  }

  private boolean isEnglish(String language) {
    if (language == null) {
      return false;
    }
    return language.toLowerCase(Locale.ROOT).startsWith("en");
  }

  private String normalize(String key) {
    return key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
  }

  private record OverridesData(Map<String, String> projectDescriptions, Map<String, String> certTitles) {
  }

  private record CacheEntry(OverridesData data, long timestamp) {
    boolean isValid() {
      return System.currentTimeMillis() - timestamp < CACHE_TTL_MS;
    }

    static CacheEntry empty() {
      return new CacheEntry(new OverridesData(Collections.emptyMap(), Collections.emptyMap()),
          System.currentTimeMillis());
    }
  }
}
