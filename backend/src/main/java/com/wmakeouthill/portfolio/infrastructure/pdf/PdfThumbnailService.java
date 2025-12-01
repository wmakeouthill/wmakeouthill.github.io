package com.wmakeouthill.portfolio.infrastructure.pdf;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;

/**
 * Serviço para gerar thumbnails (imagens de preview) de PDFs.
 * Usa Apache PDFBox para renderizar a primeira página do PDF como imagem.
 */
@Slf4j
@Service
public class PdfThumbnailService {

  /**
   * DPI para renderização do thumbnail (72 = tamanho original, 150 = boa
   * qualidade)
   */
  private static final float DEFAULT_DPI = 150f;

  /** Formato de saída da imagem */
  private static final String OUTPUT_FORMAT = "png";

  /**
   * Gera um thumbnail da primeira página do PDF.
   *
   * @param pdfBytes bytes do PDF
   * @return Optional com os bytes da imagem PNG, ou empty se falhar
   */
  public Optional<byte[]> gerarThumbnail(byte[] pdfBytes) {
    return gerarThumbnail(pdfBytes, DEFAULT_DPI);
  }

  /**
   * Gera um thumbnail da primeira página do PDF com DPI customizado.
   *
   * @param pdfBytes bytes do PDF
   * @param dpi      resolução da imagem (72 = tamanho original)
   * @return Optional com os bytes da imagem PNG, ou empty se falhar
   */
  public Optional<byte[]> gerarThumbnail(byte[] pdfBytes, float dpi) {
    if (pdfBytes == null || pdfBytes.length == 0) {
      log.warn("PDF vazio ou nulo recebido para geração de thumbnail");
      return Optional.empty();
    }

    log.info("Iniciando geração de thumbnail para PDF de {} bytes com DPI {}", pdfBytes.length, dpi);

    try (PDDocument document = Loader.loadPDF(pdfBytes)) {
      if (document.getNumberOfPages() == 0) {
        log.warn("PDF não possui páginas");
        return Optional.empty();
      }

      log.info("PDF carregado com {} páginas, renderizando primeira página...", document.getNumberOfPages());

      PDFRenderer renderer = new PDFRenderer(document);

      // Renderiza a primeira página (índice 0)
      BufferedImage image = renderer.renderImageWithDPI(0, dpi, ImageType.RGB);

      log.info("Página renderizada: {}x{} pixels", image.getWidth(), image.getHeight());

      // Converte para bytes PNG
      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      ImageIO.write(image, OUTPUT_FORMAT, outputStream);

      byte[] imageBytes = outputStream.toByteArray();
      log.info("Thumbnail gerado com sucesso: {} bytes", imageBytes.length);

      return Optional.of(imageBytes);
    } catch (IOException e) {
      log.error("Erro ao gerar thumbnail do PDF", e);
      return Optional.empty();
    }
  }

  /**
   * Gera um thumbnail com tamanho reduzido (menor DPI) para cards.
   *
   * @param pdfBytes bytes do PDF
   * @return Optional com os bytes da imagem PNG, ou empty se falhar
   */
  public Optional<byte[]> gerarThumbnailPequeno(byte[] pdfBytes) {
    return gerarThumbnail(pdfBytes, 72f); // DPI menor para thumbnail de card
  }
}
