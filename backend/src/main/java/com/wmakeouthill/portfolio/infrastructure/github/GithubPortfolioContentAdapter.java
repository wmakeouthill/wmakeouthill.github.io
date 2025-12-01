package com.wmakeouthill.portfolio.infrastructure.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Adapter para buscar conteúdo do portfólio (imagens e documentações) do GitHub.
 * Delega HTTP e cache para classes especializadas.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GithubPortfolioContentAdapter implements GithubRepositoryContentPort {

  private static final String REPO_NAME = "certificados-wesley";
  private static final String IMAGES_PATH = "portifolio_imgs";
  private static final String CONTENT_PATH = "portfolio-content";
  private static final String PROJECTS_PATH = CONTENT_PATH + "/projects";
  private static final String TRABALHOS_PATH = CONTENT_PATH + "/trabalhos";

  private final GithubHttpClient httpClient;
  private final GithubContentCache cache;

  @Override
  public List<RepositoryFileDto> listarImagensProjetos() {
    return listarArquivosDaPasta(IMAGES_PATH).stream()
        .filter(RepositoryFileDto::isImage)
        .sorted(Comparator.comparing(RepositoryFileDto::displayName))
        .toList();
  }

  @Override
  public Optional<byte[]> obterImagemBytes(String fileName) {
    return httpClient.baixarArquivoRaw(REPO_NAME, IMAGES_PATH + "/" + fileName);
  }

  @Override
  public List<RepositoryFileDto> listarDocumentacoes() {
    List<RepositoryFileDto> todos = new ArrayList<>();
    todos.addAll(listarMarkdownsDaPasta(CONTENT_PATH));
    todos.addAll(listarDocumentacoesProjetos());
    todos.addAll(listarDocumentacoesTrabalhos());
    return todos.stream()
        .sorted(Comparator.comparing(RepositoryFileDto::path))
        .toList();
  }

  @Override
  public List<RepositoryFileDto> listarDocumentacoesProjetos() {
    return listarMarkdownsDaPasta(PROJECTS_PATH);
  }

  @Override
  public List<RepositoryFileDto> listarDocumentacoesTrabalhos() {
    return listarMarkdownsDaPasta(TRABALHOS_PATH);
  }

  @Override
  public Optional<String> obterMarkdownConteudo(String path) {
    return httpClient.baixarArquivoRaw(REPO_NAME, path)
        .map(bytes -> new String(bytes, StandardCharsets.UTF_8));
  }

  @Override
  public String obterTodosMarkdownsConcatenados() {
    StringBuilder sb = new StringBuilder();
    List<RepositoryFileDto> docs = listarDocumentacoes();
    log.info("Concatenando {} documentações para IA", docs.size());

    for (RepositoryFileDto doc : docs) {
      obterMarkdownConteudo(doc.path()).ifPresent(conteudo -> {
        sb.append("\n\n# ").append(doc.displayName()).append("\n");
        sb.append("<!-- Arquivo: ").append(doc.path()).append(" -->\n\n");
        sb.append(conteudo).append("\n\n---\n");
      });
    }
    return sb.toString();
  }

  private List<RepositoryFileDto> listarMarkdownsDaPasta(String path) {
    return listarArquivosDaPasta(path).stream()
        .filter(RepositoryFileDto::isMarkdown)
        .sorted(Comparator.comparing(RepositoryFileDto::displayName))
        .toList();
  }

  private List<RepositoryFileDto> listarArquivosDaPasta(String path) {
    String cacheKey = "list:" + path;

    // Tenta cache primeiro
    Optional<List<RepositoryFileDto>> cached = cache.getFileList(cacheKey);
    if (cached.isPresent()) {
      return cached.get();
    }

    // Busca do GitHub
    Optional<JsonNode> response = httpClient.listarConteudoPasta(REPO_NAME, path);
    if (response.isEmpty() || !response.get().isArray()) {
      return List.of();
    }

    List<RepositoryFileDto> result = mapearArquivos(response.get());
    cache.putFileList(cacheKey, result);
    return result;
  }

  private List<RepositoryFileDto> mapearArquivos(JsonNode arrayNode) {
    List<RepositoryFileDto> result = new ArrayList<>();
    for (JsonNode node : arrayNode) {
      result.add(criarDto(node));
    }
    return result;
  }

  private RepositoryFileDto criarDto(JsonNode node) {
    String name = node.path("name").asText();
    String displayName = removerExtensao(name);

    return new RepositoryFileDto(
        name,
        displayName,
        node.path("path").asText(),
        node.path("download_url").asText(),
        node.path("html_url").asText(),
        node.path("size").asLong(0),
        node.path("sha").asText(),
        node.path("type").asText()
    );
  }

  private String removerExtensao(String fileName) {
    int lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  }
}
