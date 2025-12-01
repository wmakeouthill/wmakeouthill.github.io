package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Controller para servir conteúdo do portfólio (imagens e documentações).
 * Atua como proxy seguro para o repositório GitHub.
 */
@Slf4j
@RestController
@RequestMapping("/api/content")
@RequiredArgsConstructor
public class PortfolioContentController {

  private final GithubRepositoryContentPort contentPort;

  // ─────────────────────────────────────────────────────────────────────────────
  // IMAGENS DE PROJETOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lista todas as imagens de projetos disponíveis.
   */
  @GetMapping("/images")
  public ResponseEntity<List<RepositoryFileDto>> listarImagens() {
    log.info("Listando imagens de projetos");
    List<RepositoryFileDto> imagens = contentPort.listarImagensProjetos();
    return ResponseEntity.ok(imagens);
  }

  /**
   * Retorna uma imagem específica.
   * Cache de 1 hora para melhor performance.
   */
  @GetMapping("/images/{fileName}")
  public ResponseEntity<byte[]> obterImagem(@PathVariable String fileName) {
    String decodedFileName = URLDecoder.decode(fileName, StandardCharsets.UTF_8);
    log.info("Obtendo imagem: {}", decodedFileName);

    return contentPort.obterImagemBytes(decodedFileName)
        .map(bytes -> {
          MediaType mediaType = detectMediaType(decodedFileName);
          return ResponseEntity.ok()
              .contentType(mediaType)
              .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
              .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + decodedFileName + "\"")
              .body(bytes);
        })
        .orElseGet(() -> {
          log.warn("Imagem não encontrada: {}", decodedFileName);
          return ResponseEntity.notFound().build();
        });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENTAÇÕES (Markdowns)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lista todas as documentações disponíveis.
   */
  @GetMapping("/docs")
  public ResponseEntity<List<RepositoryFileDto>> listarDocumentacoes() {
    log.info("Listando todas as documentações");
    List<RepositoryFileDto> docs = contentPort.listarDocumentacoes();
    return ResponseEntity.ok(docs);
  }

  /**
   * Lista documentações de projetos.
   */
  @GetMapping("/docs/projects")
  public ResponseEntity<List<RepositoryFileDto>> listarDocumentacoesProjetos() {
    log.info("Listando documentações de projetos");
    List<RepositoryFileDto> docs = contentPort.listarDocumentacoesProjetos();
    return ResponseEntity.ok(docs);
  }

  /**
   * Lista documentações de trabalhos.
   */
  @GetMapping("/docs/trabalhos")
  public ResponseEntity<List<RepositoryFileDto>> listarDocumentacoesTrabalhos() {
    log.info("Listando documentações de trabalhos");
    List<RepositoryFileDto> docs = contentPort.listarDocumentacoesTrabalhos();
    return ResponseEntity.ok(docs);
  }

  /**
   * Retorna o conteúdo de um markdown específico.
   * O path deve ser URL-encoded (ex: portfolio-content%2Fprojects%2Faa_space.md)
   */
  @GetMapping("/docs/content")
  public ResponseEntity<String> obterMarkdown(@RequestParam String path) {
    String decodedPath = URLDecoder.decode(path, StandardCharsets.UTF_8);
    log.info("Obtendo markdown: {}", decodedPath);

    return contentPort.obterMarkdownConteudo(decodedPath)
        .map(content -> ResponseEntity.ok()
            .contentType(MediaType.TEXT_MARKDOWN)
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
            .body(content))
        .orElseGet(() -> {
          log.warn("Markdown não encontrado: {}", decodedPath);
          return ResponseEntity.notFound().build();
        });
  }

  /**
   * Retorna todos os markdowns concatenados (para alimentar a IA).
   * Cache de 10 minutos.
   */
  @GetMapping("/docs/all")
  public ResponseEntity<String> obterTodosMarkdowns() {
    log.info("Obtendo todos os markdowns concatenados para IA");
    String conteudo = contentPort.obterTodosMarkdownsConcatenados();
    
    return ResponseEntity.ok()
        .contentType(MediaType.TEXT_MARKDOWN)
        .cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic())
        .body(conteudo);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITÁRIOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Detecta o MediaType baseado na extensão do arquivo.
   */
  private MediaType detectMediaType(String fileName) {
    String lower = fileName.toLowerCase();
    if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
    if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
    if (lower.endsWith(".webp")) return MediaType.valueOf("image/webp");
    if (lower.endsWith(".svg")) return MediaType.valueOf("image/svg+xml");
    return MediaType.APPLICATION_OCTET_STREAM;
  }
}

