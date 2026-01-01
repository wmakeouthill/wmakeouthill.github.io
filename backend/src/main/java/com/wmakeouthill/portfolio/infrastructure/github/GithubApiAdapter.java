package com.wmakeouthill.portfolio.infrastructure.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.application.dto.GithubProfileDto;
import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.dto.LanguageShareDto;
import com.wmakeouthill.portfolio.application.port.out.GithubProjectsPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class GithubApiAdapter implements GithubProjectsPort {

  private static final String DEFAULT_API_URL = "https://api.github.com";
  private static final Duration TIMEOUT = Duration.ofSeconds(20);
  private static final long CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final ObjectMapper objectMapper = new ObjectMapper();

  // Cache em memória
  private final Map<String, CacheEntry<?>> cache = new ConcurrentHashMap<>();

  @Value("${github.api.username:wmakeouthill}")
  private String username;

  @Value("${github.api.token:}")
  private String tokenFromConfig;

  private record CacheEntry<T>(T data, long timestamp) {
    boolean isValid() {
      return System.currentTimeMillis() - timestamp < CACHE_TTL_MS;
    }
  }

  @Override
  public List<GithubRepositoryDto> listarRepositorios() {
    List<GithubRepositoryDto> todosRepositorios = new ArrayList<>();
    int pagina = 1;
    int perPage = 100;

    try {
      boolean continuar = true;
      while (continuar) {
        String url = DEFAULT_API_URL + "/users/" + username + "/repos?per_page=" + perPage
            + "&page=" + pagina + "&sort=updated";
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(TIMEOUT)
            .headers(defaultHeaders())
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
          List<GithubRepositoryDto> reposDaPagina = mapRepositories(response.body());
          if (reposDaPagina.isEmpty() || reposDaPagina.size() < perPage) {
            continuar = false;
          }
          if (!reposDaPagina.isEmpty()) {
            todosRepositorios.addAll(reposDaPagina);
            pagina++;
          }
        } else {
          log.error("Erro ao buscar repositórios do GitHub: status={}, body={}",
              response.statusCode(), response.body());
          continuar = false;
        }
      }

      log.info("Total de repositórios carregados: {}", todosRepositorios.size());
      return todosRepositorios;
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.error("Erro ao chamar API do GitHub", e);
    }
    return todosRepositorios.isEmpty() ? List.of() : todosRepositorios;
  }

  private String[] defaultHeaders() {
    List<String> headers = new ArrayList<>();
    headers.add("Accept");
    headers.add("application/vnd.github+json");
    headers.add("X-GitHub-Api-Version");
    headers.add("2022-11-28");

    String token = resolverToken();
    if (!token.isBlank()) {
      headers.add("Authorization");
      headers.add("Bearer " + token);
    }
    return headers.toArray(String[]::new);
  }

  private String resolverToken() {
    // 1. Tenta da propriedade Spring (github.api.token)
    if (tokenFromConfig != null && !tokenFromConfig.isBlank()) {
      log.debug("Token GitHub carregado via propriedade github.api.token");
      return tokenFromConfig;
    }

    // 2. Tenta variáveis de ambiente (ordem de prioridade)
    String githubApiToken = System.getenv("GITHUB_API_TOKEN");
    if (githubApiToken != null && !githubApiToken.isBlank()) {
      log.debug("Token GitHub carregado via variável de ambiente GITHUB_API_TOKEN");
      return githubApiToken;
    }

    String githubToken = System.getenv("GITHUB_TOKEN");
    if (githubToken != null && !githubToken.isBlank()) {
      log.debug("Token GitHub carregado via variável de ambiente GITHUB_TOKEN");
      return githubToken;
    }

    String ghToken = System.getenv("GH_TOKEN");
    if (ghToken != null && !ghToken.isBlank()) {
      log.debug("Token GitHub carregado via variável de ambiente GH_TOKEN");
      return ghToken;
    }

    log.warn("Token GitHub NÃO encontrado! Usando API sem autenticação (limite de 60 req/hora). " +
        "Configure github.api.token no configmap-secrets-local.properties ou variável de ambiente GITHUB_API_TOKEN");
    return "";
  }

  private List<GithubRepositoryDto> mapRepositories(String body) throws IOException {
    JsonNode root = objectMapper.readTree(body);
    if (!root.isArray()) {
      return List.of();
    }

    List<GithubRepositoryDto> result = new ArrayList<>();
    for (JsonNode node : root) {
      if (node.path("fork").asBoolean(false)) {
        continue;
      }

      long id = node.path("id").asLong();
      String name = node.path("name").asText();
      String fullName = node.path("full_name").asText(name);
      String description = asNullableText(node.get("description"));
      String htmlUrl = node.path("html_url").asText();
      String homepage = asNullableText(node.get("homepage"));
      int stars = node.path("stargazers_count").asInt(0);
      int forks = node.path("forks_count").asInt(0);
      String language = asNullableText(node.get("language"));
      List<String> topics = extractTopics(node);
      String createdAt = asNullableText(node.get("created_at"));
      String updatedAt = asNullableText(node.get("updated_at"));
      String pushedAt = asNullableText(node.get("pushed_at"));
      boolean fork = node.path("fork").asBoolean(false);
      var linguagensResult = buscarLinguagens(name);
      List<LanguageShareDto> languages = linguagensResult.languages();
      long totalSizeBytes = linguagensResult.totalBytes();

      GithubRepositoryDto dto = new GithubRepositoryDto(
          id,
          name,
          fullName,
          description,
          htmlUrl,
          homepage,
          stars,
          forks,
          language,
          topics,
          createdAt,
          updatedAt,
          pushedAt,
          fork,
          languages,
          totalSizeBytes);
      result.add(dto);
    }
    return result;
  }

  private String asNullableText(JsonNode node) {
    if (node == null || node.isNull()) {
      return null;
    }
    String text = node.asText();
    return text.isBlank() ? null : text;
  }

  private List<String> extractTopics(JsonNode node) {
    JsonNode topicsNode = node.get("topics");
    if (topicsNode == null || !topicsNode.isArray()) {
      return List.of();
    }
    List<String> topics = new ArrayList<>();
    for (JsonNode t : topicsNode) {
      String value = asNullableText(t);
      if (value != null) {
        topics.add(value);
      }
    }
    return topics;
  }

  private LinguagensResult buscarLinguagens(String repoName) {
    try {
      String url = DEFAULT_API_URL + "/repos/" + username + "/" + repoName + "/languages";
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(TIMEOUT)
          .headers(defaultHeaders())
          .GET()
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return mapLanguages(response.body());
      }
      log.warn("Não foi possível carregar linguagens para {}: status={}", repoName, response.statusCode());
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("Erro ao buscar linguagens para {}", repoName, e);
    }
    return new LinguagensResult(List.of(), 0L);
  }

  private record LinguagensResult(List<LanguageShareDto> languages, long totalBytes) {
  }

  private LinguagensResult mapLanguages(String body) throws IOException {
    JsonNode root = objectMapper.readTree(body);
    if (!root.isObject()) {
      return new LinguagensResult(List.of(), 0L);
    }

    long totalBytes = 0;
    Iterator<JsonNode> values = root.elements();
    while (values.hasNext()) {
      totalBytes += values.next().asLong(0);
    }
    if (totalBytes <= 0) {
      return new LinguagensResult(List.of(), 0L);
    }

    List<LanguageShareDto> languages = new ArrayList<>();
    Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
    while (fields.hasNext()) {
      Map.Entry<String, JsonNode> entry = fields.next();
      String name = entry.getKey();
      long bytes = entry.getValue().asLong(0);
      int percentage = Math.round((bytes * 100f) / totalBytes);
      String color = GithubLanguageColors.colorOf(name);
      languages.add(new LanguageShareDto(name, percentage, color));
    }

    languages.sort((a, b) -> Integer.compare(b.percentage(), a.percentage()));
    return new LinguagensResult(languages, totalBytes);
  }

  @Override
  public Optional<GithubProfileDto> buscarPerfil() {
    String cacheKey = "profile:" + username;

    @SuppressWarnings("unchecked")
    CacheEntry<GithubProfileDto> cached = (CacheEntry<GithubProfileDto>) cache.get(cacheKey);
    if (cached != null && cached.isValid()) {
      log.debug("Retornando perfil do cache");
      return Optional.of(cached.data());
    }

    try {
      String url = DEFAULT_API_URL + "/users/" + username;
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(TIMEOUT)
          .headers(defaultHeaders())
          .GET()
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        GithubProfileDto profile = mapProfile(response.body());
        cache.put(cacheKey, new CacheEntry<>(profile, System.currentTimeMillis()));
        log.info("Perfil GitHub carregado: {}", profile.login());
        return Optional.of(profile);
      }
      log.error("Erro ao buscar perfil: status={}", response.statusCode());
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.error("Erro ao buscar perfil do GitHub", e);
    }
    return Optional.empty();
  }

  private GithubProfileDto mapProfile(String body) throws IOException {
    JsonNode node = objectMapper.readTree(body);
    return new GithubProfileDto(
        node.path("id").asLong(),
        node.path("login").asText(),
        asNullableText(node.get("name")),
        node.path("avatar_url").asText(),
        node.path("html_url").asText(),
        asNullableText(node.get("bio")),
        asNullableText(node.get("company")),
        asNullableText(node.get("location")),
        asNullableText(node.get("email")),
        asNullableText(node.get("blog")),
        asNullableText(node.get("twitter_username")),
        node.path("public_repos").asInt(0),
        node.path("public_gists").asInt(0),
        node.path("followers").asInt(0),
        node.path("following").asInt(0),
        asNullableText(node.get("created_at")),
        asNullableText(node.get("updated_at")));
  }

  @Override
  public List<LanguageShareDto> buscarLinguagensRepositorio(String repoName) {
    return buscarLinguagens(repoName).languages();
  }

  @Override
  public int contarTotalEstrelas() {
    return listarRepositorios().stream()
        .mapToInt(GithubRepositoryDto::stargazersCount)
        .sum();
  }
}
