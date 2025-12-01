package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;
import com.wmakeouthill.portfolio.application.usecase.ListarCertificadosUseCase;
import com.wmakeouthill.portfolio.application.usecase.ObterCertificadoPdfUseCase;
import com.wmakeouthill.portfolio.application.usecase.ObterCurriculoUseCase;
import com.wmakeouthill.portfolio.infrastructure.pdf.PdfThumbnailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Controller para expor endpoints de certificados e currículo.
 * O backend busca os PDFs do repositório GitHub usando o token seguro.
 */
@Slf4j
@RestController
@RequestMapping("/api/certifications")
@RequiredArgsConstructor
public class CertificationsController {

  private final ListarCertificadosUseCase listarCertificadosUseCase;
  private final ObterCurriculoUseCase obterCurriculoUseCase;
  private final ObterCertificadoPdfUseCase obterCertificadoPdfUseCase;
  private final PdfThumbnailService pdfThumbnailService;

  /**
   * Lista todos os certificados (exceto currículo).
   * GET /api/certifications
   */
  @GetMapping
  public ResponseEntity<List<CertificadoPdfDto>> listarCertificados() {
    List<CertificadoPdfDto> certificados = listarCertificadosUseCase.executar();
    return ResponseEntity.ok(certificados);
  }

  /**
   * Obtém os metadados do currículo.
   * GET /api/certifications/curriculo
   */
  @GetMapping("/curriculo")
  public ResponseEntity<CertificadoPdfDto> obterCurriculo() {
    return obterCurriculoUseCase.executar()
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Obtém o PDF do currículo para visualização/download.
   * GET /api/certifications/curriculo/pdf
   */
  @GetMapping("/curriculo/pdf")
  public ResponseEntity<byte[]> obterCurriculoPdf() {
    return obterCurriculoUseCase.obterBytes()
        .map(bytes -> {
          String fileName = "Wesley de Carvalho Augusto Correia - Currículo.pdf";
          return buildPdfResponse(bytes, fileName);
        })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Obtém o thumbnail (preview) do currículo.
   * GET /api/certifications/curriculo/thumbnail
   */
  @GetMapping("/curriculo/thumbnail")
  public ResponseEntity<byte[]> obterCurriculoThumbnail() {
    return obterCurriculoUseCase.obterBytes()
        .flatMap(pdfThumbnailService::gerarThumbnailPequeno)
        .map(this::buildImageResponse)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Obtém um certificado específico pelo nome do arquivo.
   * GET /api/certifications/{fileName}/pdf
   */
  @GetMapping("/{fileName}/pdf")
  public ResponseEntity<byte[]> obterCertificadoPdf(@PathVariable String fileName) {
    String decodedFileName = decodeFileName(fileName);
    log.info("Buscando PDF: '{}' (raw: '{}')", decodedFileName, fileName);
    
    return obterCertificadoPdfUseCase.executar(decodedFileName)
        .map(bytes -> buildPdfResponse(bytes, decodedFileName))
        .orElseGet(() -> {
          log.warn("PDF não encontrado: {}", decodedFileName);
          return ResponseEntity.notFound().build();
        });
  }

  /**
   * Obtém o thumbnail (preview) de um certificado específico.
   * GET /api/certifications/{fileName}/thumbnail
   */
  @GetMapping("/{fileName}/thumbnail")
  public ResponseEntity<byte[]> obterCertificadoThumbnail(@PathVariable String fileName) {
    String decodedFileName = decodeFileName(fileName);
    log.info("Gerando thumbnail para: '{}' (raw: '{}')", decodedFileName, fileName);
    
    return obterCertificadoPdfUseCase.executar(decodedFileName)
        .flatMap(pdfThumbnailService::gerarThumbnailPequeno)
        .map(this::buildImageResponse)
        .orElseGet(() -> {
          log.warn("Thumbnail não gerado - PDF não encontrado: {}", decodedFileName);
          return ResponseEntity.notFound().build();
        });
  }

  /**
   * Decodifica o nome do arquivo da URL.
   */
  private String decodeFileName(String fileName) {
    try {
      return URLDecoder.decode(fileName, StandardCharsets.UTF_8);
    } catch (Exception e) {
      log.warn("Erro ao decodificar fileName: {}", fileName);
      return fileName;
    }
  }

  /**
   * Constrói a resposta HTTP com o PDF.
   */
  private ResponseEntity<byte[]> buildPdfResponse(byte[] pdfBytes, String fileName) {
    String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
        .replace("+", "%20");
    
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, 
            "inline; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName)
        .contentType(MediaType.APPLICATION_PDF)
        .contentLength(pdfBytes.length)
        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
        .body(pdfBytes);
  }

  /**
   * Constrói a resposta HTTP com a imagem PNG.
   */
  private ResponseEntity<byte[]> buildImageResponse(byte[] imageBytes) {
    return ResponseEntity.ok()
        .contentType(MediaType.IMAGE_PNG)
        .contentLength(imageBytes.length)
        .cacheControl(CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic())
        .body(imageBytes);
  }
}
