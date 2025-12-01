package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.port.out.CertificadosPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Caso de uso para obter os bytes de um certificado PDF específico.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ObterCertificadoPdfUseCase {

    private final CertificadosPort certificadosPort;

    /**
     * Obtém os bytes de um certificado PDF pelo nome do arquivo.
     *
     * @param fileName nome do arquivo PDF
     * @return Optional com os bytes do PDF, ou empty se não encontrado
     */
    public Optional<byte[]> executar(String fileName) {
        log.info("Buscando PDF: {}", fileName);
        Optional<byte[]> pdfBytes = certificadosPort.obterPdfBytes(fileName);
        if (pdfBytes.isPresent()) {
            log.info("PDF encontrado: {} ({} bytes)", fileName, pdfBytes.get().length);
        } else {
            log.warn("PDF não encontrado: {}", fileName);
        }
        return pdfBytes;
    }
}
