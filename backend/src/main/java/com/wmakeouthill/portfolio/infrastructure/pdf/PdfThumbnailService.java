package com.wmakeouthill.portfolio.infrastructure.pdf;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
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

  /** Formato de saída da imagem (JPEG: nativo do JDK, ~75% menor que PNG nessas
   *  páginas escaneadas, container-safe sem dependência nativa). */
  private static final String OUTPUT_FORMAT = "jpg";

  /** Qualidade do JPEG (0.0–1.0). 0.82 é o ponto bom para scans de certificados. */
  private static final float JPEG_QUALITY = 0.82f;

  /**
   * Gera um thumbnail da primeira página do PDF.
   *
   * @param pdfBytes bytes do PDF
   * @return Optional com os bytes da imagem JPEG, ou empty se falhar
   */
  public Optional<byte[]> gerarThumbnail(byte[] pdfBytes) {
    return gerarThumbnail(pdfBytes, DEFAULT_DPI);
  }

  /**
   * Gera um thumbnail da primeira página do PDF com DPI customizado.
   *
   * @param pdfBytes bytes do PDF
   * @param dpi      resolução da imagem (72 = tamanho original)
   * @return Optional com os bytes da imagem JPEG, ou empty se falhar
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

      // Converte para bytes JPEG com qualidade controlada
      byte[] imageBytes = encodeJpeg(image);
      log.info("Thumbnail gerado com sucesso: {} bytes", imageBytes.length);

      return Optional.of(imageBytes);
    } catch (IOException e) {
      log.error("Erro ao gerar thumbnail do PDF", e);
      return Optional.empty();
    }
  }

  /**
   * Codifica a imagem como JPEG aplicando {@link #JPEG_QUALITY}. A imagem é
   * renderizada como {@link ImageType#RGB} (sem canal alfa), então é JPEG-safe.
   */
  private static byte[] encodeJpeg(BufferedImage image) throws IOException {
    ImageWriter writer = ImageIO.getImageWritersByFormatName(OUTPUT_FORMAT).next();
    ImageWriteParam param = writer.getDefaultWriteParam();
    param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
    param.setCompressionQuality(JPEG_QUALITY);

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    try (ImageOutputStream ios = ImageIO.createImageOutputStream(outputStream)) {
      writer.setOutput(ios);
      writer.write(null, new IIOImage(image, null, null), param);
    } finally {
      writer.dispose();
    }
    return outputStream.toByteArray();
  }

  /**
   * Gera um thumbnail com tamanho reduzido (menor DPI) para cards.
   *
   * @param pdfBytes bytes do PDF
   * @return Optional com os bytes da imagem JPEG, ou empty se falhar
   */
  public Optional<byte[]> gerarThumbnailPequeno(byte[] pdfBytes) {
    return gerarThumbnail(pdfBytes, 72f); // DPI menor para thumbnail de card
  }
}
