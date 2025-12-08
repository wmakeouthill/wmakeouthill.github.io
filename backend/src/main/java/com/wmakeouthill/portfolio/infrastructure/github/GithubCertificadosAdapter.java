package com.wmakeouthill.portfolio.infrastructure.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;
import com.wmakeouthill.portfolio.application.port.out.CertificadosPort;
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
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Adapter para buscar certificados e currículo do repositório GitHub.
 * Usa o token do GitHub para autenticação (seguro no backend).
 */
@Slf4j
@Component
public class GithubCertificadosAdapter implements CertificadosPort {

  private static final String DEFAULT_API_URL = "https://api.github.com";
  private static final Duration TIMEOUT = Duration.ofSeconds(30);

  /** Nome do repositório de certificados */
  private static final String REPO_NAME = "certificados-wesley";

  /** Nome exato do arquivo de currículo (PT) */
  private static final String CURRICULO_FILE_NAME = "Wesley de Carvalho Augusto Correia - Currículo.pdf";
  /** Nome exato do arquivo de currículo (EN) */
  private static final String CURRICULO_EN_FILE_NAME = "Wesley de Carvalho Augusto Correia - Resume.pdf";

  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Value("${github.api.username:wmakeouthill}")
  private String username;

  @Value("${github.api.token:}")
  private String tokenFromConfig;

  @Override
  public List<CertificadoPdfDto> listarCertificados() {
    List<CertificadoPdfDto> todosPdfs = listarTodosPdfs();

    // Filtra excluindo o currículo
    return todosPdfs.stream()
        .filter(pdf -> !isCurriculo(pdf.fileName()))
        .sorted(Comparator.comparing(CertificadoPdfDto::displayName))
        .toList();
  }

  @Override
  public Optional<CertificadoPdfDto> obterCurriculo() {
    return obterCurriculo("pt");
  }

  @Override
  public Optional<CertificadoPdfDto> obterCurriculo(String language) {
    List<CertificadoPdfDto> todosPdfs = listarTodosPdfs();
    boolean english = language != null && language.toLowerCase().startsWith("en");

    // Preferência pelo idioma solicitado
    Optional<CertificadoPdfDto> preferido = english
        ? encontrarPorNome(todosPdfs, CURRICULO_EN_FILE_NAME)
        : encontrarPorNome(todosPdfs, CURRICULO_FILE_NAME);

    if (preferido.isPresent()) {
      return preferido;
    }

    // Fallback: tenta o outro idioma
    return english
        ? encontrarPorNome(todosPdfs, CURRICULO_FILE_NAME)
        : encontrarPorNome(todosPdfs, CURRICULO_EN_FILE_NAME);
  }

  @Override
  public Optional<byte[]> obterPdfBytes(String fileName) {
    try {
      // Primeiro busca o arquivo para obter a download_url
      List<CertificadoPdfDto> todosPdfs = listarTodosPdfs();
      log.info("Buscando arquivo '{}' entre {} PDFs disponíveis", fileName, todosPdfs.size());

      // Busca case-insensitive para maior flexibilidade
      Optional<CertificadoPdfDto> arquivo = todosPdfs.stream()
          .filter(pdf -> pdf.fileName().equalsIgnoreCase(fileName))
          .findFirst();

      if (arquivo.isEmpty()) {
        // Log dos arquivos disponíveis para debug
        log.warn("Arquivo não encontrado: '{}'. Arquivos disponíveis: {}",
            fileName,
            todosPdfs.stream().map(CertificadoPdfDto::fileName).toList());
        return Optional.empty();
      }

      // Faz download do conteúdo - constrói URL encodada manualmente
      String downloadUrl = buildEncodedDownloadUrl(arquivo.get().fileName());
      log.debug("Baixando PDF de: {}", downloadUrl);

      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(downloadUrl))
          .timeout(TIMEOUT)
          .headers(defaultHeaders())
          .GET()
          .build();

      HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        log.info("PDF baixado com sucesso: {} ({} bytes)", fileName, response.body().length);
        return Optional.of(response.body());
      } else {
        log.error("Erro ao baixar PDF {}: status={}", fileName, response.statusCode());
        return Optional.empty();
      }
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.error("Erro ao baixar PDF: {}", fileName, e);
      return Optional.empty();
    }
  }

  /**
   * Lista todos os PDFs do repositório de certificados.
   */
  private List<CertificadoPdfDto> listarTodosPdfs() {
    try {
      String url = DEFAULT_API_URL + "/repos/" + username + "/" + REPO_NAME + "/contents";
      log.debug("Buscando conteúdo do repositório: {}", url);

      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(TIMEOUT)
          .headers(defaultHeaders())
          .GET()
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return mapArquivos(response.body());
      } else {
        log.error("Erro ao buscar conteúdo do repositório: status={}, body={}",
            response.statusCode(), response.body());
        return List.of();
      }
    } catch (IOException | InterruptedException e) {
      Thread.currentThread().interrupt();
      log.error("Erro ao chamar API do GitHub para certificados", e);
      return List.of();
    }
  }

  /**
   * Mapeia a resposta JSON para lista de CertificadoPdfDto.
   */
  private List<CertificadoPdfDto> mapArquivos(String body) throws IOException {
    JsonNode root = objectMapper.readTree(body);
    if (!root.isArray()) {
      return List.of();
    }

    List<CertificadoPdfDto> result = new ArrayList<>();
    for (JsonNode node : root) {
      String type = node.path("type").asText();
      String name = node.path("name").asText();

      // Filtra apenas arquivos PDF
      if (!"file".equals(type) || !name.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      String displayName = name.replaceAll("(?i)\\.pdf$", "");
      String downloadUrl = node.path("download_url").asText();
      String htmlUrl = node.path("html_url").asText();
      long size = node.path("size").asLong(0);
      String sha = node.path("sha").asText();

      CertificadoPdfDto dto = new CertificadoPdfDto(
          name,
          displayName,
          downloadUrl,
          htmlUrl,
          size,
          sha);
      result.add(dto);
    }

    log.debug("Encontrados {} arquivos PDF no repositório", result.size());
    return result;
  }

  /**
   * Constrói os headers padrão com autenticação.
   */
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

  /**
   * Constrói a URL de download com o nome do arquivo encodado corretamente.
   * O raw.githubusercontent.com requer que caracteres especiais sejam
   * URL-encoded.
   */
  private String buildEncodedDownloadUrl(String fileName) {
    String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
        .replace("+", "%20"); // Espaços devem ser %20, não +
    return "https://raw.githubusercontent.com/" + username + "/" + REPO_NAME + "/main/" + encodedFileName;
  }

  /**
   * Resolve o token do GitHub de forma segura.
   */
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

    log.warn("Token GitHub NÃO encontrado para certificados! Usando API sem autenticação.");
    return "";
  }

  private Optional<CertificadoPdfDto> encontrarPorNome(List<CertificadoPdfDto> lista, String fileName) {
    return lista.stream()
        .filter(pdf -> pdf.fileName().equalsIgnoreCase(fileName))
        .findFirst();
  }

  private boolean isCurriculo(String fileName) {
    String lower = fileName.toLowerCase();
    return lower.equals(CURRICULO_FILE_NAME.toLowerCase()) || lower.equals(CURRICULO_EN_FILE_NAME.toLowerCase());
  }
}
