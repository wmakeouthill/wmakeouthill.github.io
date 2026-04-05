package com.wmakeouthill.portfolio.infrastructure.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.infrastructure.cache.ConditionalResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Cliente HTTP reutilizável para chamadas à API do GitHub.
 * Centraliza autenticação, headers, encoding de URLs e suporte a ETag.
 */
@Slf4j
@Component
public class GithubHttpClient {

  private static final String API_URL = "https://api.github.com";
  private static final String RAW_URL = "https://raw.githubusercontent.com";
  private static final Duration TIMEOUT = Duration.ofSeconds(30);

  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Value("${github.api.username:wmakeouthill}")
  private String username;

  @Value("${github.api.token:}")
  private String tokenFromConfig;

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos condicionais (ETag / If-None-Match)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lista repositórios do usuário com suporte a ETag.
   * 304 = nada mudou, não conta como chamada de API para rate limit.
   */
  public ConditionalResponse<JsonNode> buscarReposPaginaCondicional(int page, int perPage, String etag) {
    String url = API_URL + "/users/" + username + "/repos?per_page=" + perPage
        + "&page=" + page + "&sort=updated";
    return fazerGetCondicional(url, etag);
  }

  /**
   * Busca perfil do usuário com suporte a ETag.
   */
  public ConditionalResponse<JsonNode> buscarPerfilCondicional(String etag) {
    String url = API_URL + "/users/" + username;
    return fazerGetCondicional(url, etag);
  }

  /**
   * Busca linguagens de um repositório com suporte a ETag.
   */
  public ConditionalResponse<JsonNode> buscarLinguagensCondicional(String repoName, String etag) {
    String url = API_URL + "/repos/" + username + "/" + repoName + "/languages";
    return fazerGetCondicional(url, etag);
  }

  /**
   * Busca árvore de arquivos de um repositório com suporte a ETag.
   */
  public ConditionalResponse<JsonNode> buscarArvoreCondicional(String repoName, String etag) {
    String url = API_URL + "/repos/" + username + "/" + repoName + "/git/trees/main?recursive=1";
    return fazerGetCondicional(url, etag);
  }

  /**
   * Lista conteúdo de uma pasta do repositório com suporte a ETag (conditional request).
   * Se o ETag não mudou, retorna NOT_MODIFIED economizando bandwidth.
   */
  public ConditionalResponse<JsonNode> listarConteudoPastaCondicional(String repoName, String path, String etag) {
    String url = API_URL + "/repos/" + username + "/" + repoName + "/contents/" + path;
    return fazerGetCondicional(url, etag);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos simples (sem ETag)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lista conteúdo de uma pasta do repositório (sem ETag).
   */
  public Optional<JsonNode> listarConteudoPasta(String repoName, String path) {
    String url = API_URL + "/repos/" + username + "/" + repoName + "/contents/" + path;
    log.debug("Buscando conteúdo: {}", url);

    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(TIMEOUT)
          .headers(buildApiHeaders())
          .GET()
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return Optional.of(objectMapper.readTree(response.body()));
      }
      log.error("Erro ao buscar {}: status={}", path, response.statusCode());
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.error("Erro HTTP ao buscar: {}", path, e);
    }
    return Optional.empty();
  }

  /**
   * Baixa bytes de um arquivo raw do repositório.
   */
  public Optional<byte[]> baixarArquivoRaw(String repoName, String path) {
    String downloadUrl = buildRawUrl(repoName, path);
    log.debug("Baixando: {}", downloadUrl);

    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(downloadUrl))
          .timeout(TIMEOUT)
          .headers(buildDownloadHeaders())
          .GET()
          .build();

      HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        log.debug("Download OK: {} ({} bytes)", path, response.body().length);
        return Optional.of(response.body());
      }
      log.error("Erro ao baixar {}: status={}", path, response.statusCode());
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.error("Erro HTTP ao baixar: {}", path, e);
    }
    return Optional.empty();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilitários internos
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Faz um GET condicional com If-None-Match.
   * 304 não consome quota de rate limit do GitHub.
   */
  private ConditionalResponse<JsonNode> fazerGetCondicional(String url, String etag) {
    log.debug("GET condicional: {}", url);

    try {
      HttpRequest.Builder builder = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(TIMEOUT)
          .headers(buildApiHeaders())
          .GET();

      if (etag != null && !etag.isBlank()) {
        builder.header("If-None-Match", etag);
      }

      HttpRequest request = builder.build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() == 304) {
        log.debug("304 Not Modified: {}", url);
        return ConditionalResponse.notModified();
      }

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        String newEtag = response.headers().firstValue("ETag").orElse(null);
        JsonNode data = objectMapper.readTree(response.body());
        log.debug("200 OK (nova ETag: {}): {}", newEtag != null ? "sim" : "null", url);
        return ConditionalResponse.ok(data, newEtag);
      }

      log.error("Erro {}: status={}", url, response.statusCode());
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.error("Erro HTTP: {}", url, e);
    }
    return ConditionalResponse.error();
  }

  private String buildRawUrl(String repoName, String path) {
    String[] segments = path.split("/");
    StringBuilder encodedPath = new StringBuilder();
    for (int i = 0; i < segments.length; i++) {
      if (i > 0)
        encodedPath.append("/");
      encodedPath.append(URLEncoder.encode(segments[i], StandardCharsets.UTF_8)
          .replace("+", "%20"));
    }
    return RAW_URL + "/" + username + "/" + repoName + "/main/" + encodedPath;
  }

  private String[] buildApiHeaders() {
    List<String> headers = new ArrayList<>();
    headers.add("Accept");
    headers.add("application/vnd.github+json");
    headers.add("X-GitHub-Api-Version");
    headers.add("2022-11-28");
    addAuthHeader(headers);
    return headers.toArray(String[]::new);
  }

  private String[] buildDownloadHeaders() {
    List<String> headers = new ArrayList<>();
    headers.add("Accept");
    headers.add("application/octet-stream");
    addAuthHeader(headers);
    return headers.toArray(String[]::new);
  }

  private void addAuthHeader(List<String> headers) {
    String token = resolverToken();
    if (!token.isBlank()) {
      headers.add("Authorization");
      headers.add("Bearer " + token);
    }
  }

  private String resolverToken() {
    if (tokenFromConfig != null && !tokenFromConfig.isBlank()) {
      return tokenFromConfig;
    }
    for (String envVar : List.of("GITHUB_API_TOKEN", "GITHUB_TOKEN", "GH_TOKEN")) {
      String token = System.getenv(envVar);
      if (token != null && !token.isBlank()) {
        return token;
      }
    }
    return "";
  }
}
