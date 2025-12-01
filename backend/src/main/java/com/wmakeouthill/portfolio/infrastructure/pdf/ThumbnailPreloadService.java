package com.wmakeouthill.portfolio.infrastructure.pdf;

import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;
import com.wmakeouthill.portfolio.application.port.out.CertificadosPort;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Serviço para pré-carregar thumbnails de PDFs no startup da aplicação.
 * Isso garante que as thumbnails estejam prontas quando o usuário acessar.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ThumbnailPreloadService {

    private final CertificadosPort certificadosPort;
    private final PdfThumbnailService pdfThumbnailService;
    private final ThumbnailCacheService thumbnailCacheService;

    /**
     * Pré-carrega todas as thumbnails quando a aplicação inicia.
     * Executa em background para não atrasar o startup.
     */
    @PostConstruct
    public void preloadOnStartup() {
        log.info("📷 Iniciando pré-carregamento de thumbnails em background...");
        preloadAllThumbnailsAsync();
    }

    /**
     * Pré-carrega thumbnails de forma assíncrona.
     */
    @Async
    public CompletableFuture<Integer> preloadAllThumbnailsAsync() {
        return CompletableFuture.supplyAsync(this::preloadAllThumbnails);
    }

    /**
     * Pré-carrega todas as thumbnails de certificados e currículo.
     * @return número de thumbnails carregadas com sucesso
     */
    public int preloadAllThumbnails() {
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        try {
            // Lista todos os certificados
            List<CertificadoPdfDto> certificados = certificadosPort.listarCertificados();
            log.info("📷 Pré-carregando thumbnails de {} certificados...", certificados.size());

            for (CertificadoPdfDto cert : certificados) {
                preloadThumbnail(cert.fileName(), successCount, errorCount);
            }

            // Também pré-carrega o currículo
            certificadosPort.obterCurriculo().ifPresent(curriculo -> {
                preloadThumbnail(curriculo.fileName(), successCount, errorCount);
            });

            log.info("✅ Pré-carregamento concluído: {} thumbnails OK, {} erros", 
                successCount.get(), errorCount.get());

        } catch (Exception e) {
            log.error("❌ Erro durante pré-carregamento de thumbnails", e);
        }

        return successCount.get();
    }

    /**
     * Pré-carrega uma thumbnail específica.
     */
    private void preloadThumbnail(String fileName, AtomicInteger successCount, AtomicInteger errorCount) {
        try {
            // Verifica se já está no cache
            if (thumbnailCacheService.hasThumbnail(fileName)) {
                log.debug("Thumbnail já em cache: {}", fileName);
                successCount.incrementAndGet();
                return;
            }

            // Baixa o PDF
            var pdfBytesOpt = certificadosPort.obterPdfBytes(fileName);
            if (pdfBytesOpt.isEmpty()) {
                log.warn("PDF não encontrado para thumbnail: {}", fileName);
                errorCount.incrementAndGet();
                return;
            }

            byte[] pdfBytes = pdfBytesOpt.get();
            
            // Cacheia o PDF
            thumbnailCacheService.putPdf(fileName, pdfBytes);

            // Gera a thumbnail
            var thumbnailOpt = pdfThumbnailService.gerarThumbnailPequeno(pdfBytes);
            if (thumbnailOpt.isEmpty()) {
                log.warn("Falha ao gerar thumbnail: {}", fileName);
                errorCount.incrementAndGet();
                return;
            }

            // Cacheia a thumbnail
            thumbnailCacheService.putThumbnail(fileName, thumbnailOpt.get());
            successCount.incrementAndGet();
            log.debug("✓ Thumbnail pré-carregada: {}", fileName);

        } catch (Exception e) {
            log.error("Erro ao pré-carregar thumbnail de {}: {}", fileName, e.getMessage());
            errorCount.incrementAndGet();
        }
    }

    /**
     * Força recarregamento de todas as thumbnails.
     */
    public int refreshAll() {
        thumbnailCacheService.clearAll();
        return preloadAllThumbnails();
    }
}

