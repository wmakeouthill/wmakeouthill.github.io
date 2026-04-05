package com.wmakeouthill.portfolio.infrastructure.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.wmakeouthill.portfolio.application.dto.FileContentDto;
import com.wmakeouthill.portfolio.application.dto.GithubProfileDto;
import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.dto.LanguageShareDto;
import com.wmakeouthill.portfolio.application.dto.TreeNodeDto;
import com.wmakeouthill.portfolio.application.port.out.GithubProjectsPort;
import com.wmakeouthill.portfolio.infrastructure.cache.CacheEntryWithETag;
import com.wmakeouthill.portfolio.infrastructure.cache.ConditionalResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Adapter para integração com a API do GitHub.
 * Usa ETag / conditional requests em todos os endpoints:
 * - 304 Not Modified → não consome rate limit, renova TTL do cache
 * - 200 OK           → atualiza cache com nova ETag
 * - Linguagens: granular por pushedAt — só rebusca repos que tiveram push
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GithubApiAdapter implements GithubProjectsPort {

  private static final long CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
  private static final int PER_PAGE = 100;

  private final GithubHttpClient githubHttpClient;

  /** Cache thread-safe: chave → CacheEntryWithETag<?> */
  private final Map<String, CacheEntryWithETag<?>> cache = new ConcurrentHashMap<>();

  // ─────────────────────────────────────────────────────────────────────────────
  // GithubProjectsPort
  // ─────────────────────────────────────────────────────────────────────────────

  @Override
  public List<GithubRepositoryDto> listarRepositorios() {
    final String cacheKey = "repos:all";
    CacheEntryWithETag<List<GithubRepositoryDto>> cached = getCache(cacheKey);

    // Cache válido → retorna imediatamente, sem chamar GitHub
    if (cached != null && !cached.isExpired()) {
      log.debug("Repos do cache ({}s)", cached.getAgeSeconds());
      return cached.getValue();
    }

    // Cache expirado ou inexistente → requisição condicional na página 1
    // (page 1 com sort=updated é o sinal: qualquer push ou repo novo aparece aqui)
    String existingEtag = cached != null ? cached.getEtag().orElse(null) : null;
    ConditionalResponse<JsonNode> page1 = githubHttpClient.buscarReposPaginaCondicional(1, PER_PAGE, existingEtag);

    // 304: nada mudou → renova TTL, 0 quota consumida
    if (page1.isNotModified() && cached != null) {
      log.info("Repos: 304 Not Modified — renovando TTL (sem chamada extra ao GitHub)");
      putCache(cacheKey, cached.getValue(), existingEtag);
      return cached.getValue();
    }

    // Erro → fallback para cache expirado
    if (page1.isError() || page1.data() == null) {
      log.warn("Repos: erro na requisição, usando cache possivelmente desatualizado");
      return cached != null ? cached.getValue() : List.of();
    }

    // 200: mudanças detectadas → recarrega todos os repos com linguagens granulares
    log.info("Repos: mudanças detectadas (nova ETag) — recarregando...");

    // Mapa pushedAt anterior por nome (para skip granular de linguagens)
    List<GithubRepositoryDto> anteriores = cached != null ? cached.getValue() : List.of();
    Map<String, String> prevPushedAt = anteriores.stream()
        .collect(Collectors.toMap(
            GithubRepositoryDto::name,
            r -> r.pushedAt() != null ? r.pushedAt() : "",
            (a, b) -> a));

    List<GithubRepositoryDto> todos = new ArrayList<>(mapRepositories(page1.data(), prevPushedAt));

    // Busca páginas adicionais se página 1 estava cheia
    if (page1.data().size() >= PER_PAGE) {
      int pagina = 2;
      while (true) {
        ConditionalResponse<JsonNode> pageN = githubHttpClient.buscarReposPaginaCondicional(pagina, PER_PAGE, null);
        if (!pageN.isOk() || pageN.data() == null || !pageN.data().isArray()) break;
        List<GithubRepositoryDto> reposDaPagina = mapRepositories(pageN.data(), prevPushedAt);
        todos.addAll(reposDaPagina);
        if (pageN.data().size() < PER_PAGE) break;
        pagina++;
      }
    }

    log.info("Repos carregados: {} (ETag armazenada: {})", todos.size(), page1.etag() != null ? "sim" : "não");
    putCache(cacheKey, todos, page1.etag());
    return todos;
  }

  @Override
  public Optional<GithubProfileDto> buscarPerfil() {
    final String cacheKey = "profile";
    CacheEntryWithETag<GithubProfileDto> cached = getCache(cacheKey);

    if (cached != null && !cached.isExpired()) {
      log.debug("Perfil do cache");
      return Optional.of(cached.getValue());
    }

    String etag = cached != null ? cached.getEtag().orElse(null) : null;
    ConditionalResponse<JsonNode> response = githubHttpClient.buscarPerfilCondicional(etag);

    if (response.isNotModified() && cached != null) {
      log.info("Perfil: 304 Not Modified — renovando TTL");
      putCache(cacheKey, cached.getValue(), etag);
      return Optional.of(cached.getValue());
    }

    if (response.isOk() && response.data() != null) {
      GithubProfileDto profile = mapProfile(response.data());
      putCache(cacheKey, profile, response.etag());
      log.info("Perfil atualizado: {}", profile.login());
      return Optional.of(profile);
    }

    log.warn("Perfil: erro, usando fallback de cache");
    return cached != null ? Optional.of(cached.getValue()) : Optional.empty();
  }

  @Override
  public List<LanguageShareDto> buscarLinguagensRepositorio(String repoName) {
    // Chamado diretamente (sem contexto de pushedAt) → verifica cache, faz ETag se expirado
    return buscarLinguagensPorRepo(repoName, false).languages();
  }

  @Override
  public int contarTotalEstrelas() {
    return listarRepositorios().stream()
        .mapToInt(GithubRepositoryDto::stargazersCount)
        .sum();
  }

  @Override
  public List<TreeNodeDto> buscarArvoreRepositorio(String repoName) {
    final String cacheKey = "tree:" + repoName;
    CacheEntryWithETag<List<TreeNodeDto>> cached = getCache(cacheKey);

    if (cached != null && !cached.isExpired()) {
      log.debug("Árvore {} do cache", repoName);
      return cached.getValue();
    }

    String etag = cached != null ? cached.getEtag().orElse(null) : null;
    ConditionalResponse<JsonNode> response = githubHttpClient.buscarArvoreCondicional(repoName, etag);

    if (response.isNotModified() && cached != null) {
      log.info("Árvore {}: 304 Not Modified — renovando TTL", repoName);
      putCache(cacheKey, cached.getValue(), etag);
      return cached.getValue();
    }

    if (response.isOk() && response.data() != null) {
      List<TreeNodeDto> tree = mapTree(response.data());
      putCache(cacheKey, tree, response.etag());
      log.info("Árvore {} atualizada: {} itens", repoName, tree.size());
      return tree;
    }

    log.warn("Árvore {}: erro, usando fallback de cache", repoName);
    return cached != null ? cached.getValue() : List.of();
  }

  @Override
  public Optional<FileContentDto> buscarConteudoArquivo(String repoName, String filePath) {
    final String cacheKey = "file:" + repoName + ":" + filePath;
    CacheEntryWithETag<FileContentDto> cached = getCache(cacheKey);

    if (cached != null && !cached.isExpired()) {
      log.debug("Conteúdo {}/{} do cache", repoName, filePath);
      return Optional.of(cached.getValue());
    }

    // raw.githubusercontent.com não suporta ETags da mesma forma — usa TTL simples
    return githubHttpClient.baixarArquivoRaw(repoName, filePath).map(bytes -> {
      String content = new String(bytes, StandardCharsets.UTF_8);
      String name = filePath.contains("/") ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath;
      FileContentDto fileContent = new FileContentDto(name, filePath, content);
      putCache(cacheKey, fileContent, null);
      log.debug("Conteúdo {}/{} carregado", repoName, filePath);
      return fileContent;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Linguagens — lógica granular
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Busca linguagens de um repo com ETag.
   *
   * @param pushedAtChanged true = o repo teve push desde o último cache →
   *                        sempre tenta ETag mesmo com cache válido.
   *                        false = cache válido é suficiente, sem chamada ao GitHub.
   */
  private LinguagensResult buscarLinguagensPorRepo(String repoName, boolean pushedAtChanged) {
    final String cacheKey = "langs:" + repoName;
    CacheEntryWithETag<LinguagensResult> cached = getCache(cacheKey);

    // Cache válido E sem push detectado → retorna direto, 0 chamadas ao GitHub
    if (cached != null && !cached.isExpired() && !pushedAtChanged) {
      log.debug("Linguagens {} do cache (sem push, 0 chamadas)", repoName);
      return cached.getValue();
    }

    // Cache expirado OU push detectado → ETag condicional
    String etag = cached != null ? cached.getEtag().orElse(null) : null;
    ConditionalResponse<JsonNode> response = githubHttpClient.buscarLinguagensCondicional(repoName, etag);

    if (response.isNotModified() && cached != null) {
      log.debug("Linguagens {}: 304 Not Modified — renovando TTL", repoName);
      putCache(cacheKey, cached.getValue(), etag);
      return cached.getValue();
    }

    if (response.isOk() && response.data() != null) {
      LinguagensResult result = mapLanguages(response.data());
      putCache(cacheKey, result, response.etag());
      log.debug("Linguagens {} atualizadas ({} langs)", repoName, result.languages().size());
      return result;
    }

    log.warn("Linguagens {}: erro, usando fallback de cache", repoName);
    return cached != null ? cached.getValue() : new LinguagensResult(List.of(), 0L);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mapeamentos
  // ─────────────────────────────────────────────────────────────────────────────

  private List<GithubRepositoryDto> mapRepositories(JsonNode root, Map<String, String> prevPushedAt) {
    if (root == null || !root.isArray()) {
      return List.of();
    }

    List<GithubRepositoryDto> result = new ArrayList<>();
    for (JsonNode node : root) {
      if (node.path("fork").asBoolean(false)) {
        continue;
      }

      String name = node.path("name").asText();
      String pushedAt = asNullableText(node.get("pushed_at"));

      // Granular: só rebusca linguagens se o repo teve push desde o último cache
      String prevPushed = prevPushedAt.getOrDefault(name, "");
      boolean pushedAtChanged = !prevPushed.equals(pushedAt != null ? pushedAt : "");

      LinguagensResult linguagensResult = buscarLinguagensPorRepo(name, pushedAtChanged);

      result.add(new GithubRepositoryDto(
          node.path("id").asLong(),
          name,
          node.path("full_name").asText(name),
          asNullableText(node.get("description")),
          node.path("html_url").asText(),
          asNullableText(node.get("homepage")),
          node.path("stargazers_count").asInt(0),
          node.path("forks_count").asInt(0),
          asNullableText(node.get("language")),
          extractTopics(node),
          asNullableText(node.get("created_at")),
          asNullableText(node.get("updated_at")),
          pushedAt,
          node.path("fork").asBoolean(false),
          linguagensResult.languages(),
          linguagensResult.totalBytes()));
    }
    return result;
  }

  private GithubProfileDto mapProfile(JsonNode node) {
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

  private List<TreeNodeDto> mapTree(JsonNode root) {
    JsonNode treeNode = root.get("tree");
    if (treeNode == null || !treeNode.isArray()) {
      return List.of();
    }

    List<TreeNodeDto> result = new ArrayList<>();
    for (JsonNode node : treeNode) {
      result.add(new TreeNodeDto(
          node.path("path").asText(),
          node.path("type").asText(),
          node.path("sha").asText()));
    }
    return result;
  }

  private LinguagensResult mapLanguages(JsonNode root) {
    if (root == null || !root.isObject()) {
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
      long bytes = entry.getValue().asLong(0);
      int percentage = Math.round((bytes * 100f) / totalBytes);
      String color = GithubLanguageColors.colorOf(entry.getKey());
      languages.add(new LanguageShareDto(entry.getKey(), percentage, color));
    }

    languages.sort((a, b) -> Integer.compare(b.percentage(), a.percentage()));
    return new LinguagensResult(languages, totalBytes);
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

  @Override
  public void clearCache() {
    // Expira as entradas SEM apagar as ETags.
    // A próxima requisição envia If-None-Match ao GitHub:
    //   304 → nada mudou, zero quota consumida, TTL renovado
    //   200 → mudou, só rebusca o que realmente alterou (granular por pushedAt)
    cache.replaceAll((key, entry) ->
        new CacheEntryWithETag<>(entry.getValue(), 0L, entry.getEtag().orElse(null)));
    log.info("Cache de projetos expirado (ETags preservados) — próxima requisição será condicional");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cache helpers
  // ─────────────────────────────────────────────────────────────────────────────

  @SuppressWarnings("unchecked")
  private <T> CacheEntryWithETag<T> getCache(String key) {
    return (CacheEntryWithETag<T>) cache.get(key);
  }

  private <T> void putCache(String key, T value, String etag) {
    cache.put(key, new CacheEntryWithETag<>(value, CACHE_TTL_MS, etag));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tipos internos
  // ─────────────────────────────────────────────────────────────────────────────

  private record LinguagensResult(List<LanguageShareDto> languages, long totalBytes) {
  }
}
