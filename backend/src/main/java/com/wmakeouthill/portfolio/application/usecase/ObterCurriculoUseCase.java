package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;
import com.wmakeouthill.portfolio.application.port.out.CertificadosPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Caso de uso para obter o currículo do repositório GitHub.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ObterCurriculoUseCase {

    private final CertificadosPort certificadosPort;

    /**
     * Obtém os metadados do currículo.
     *
     * @return Optional com o currículo, ou empty se não encontrado
     */
    public Optional<CertificadoPdfDto> executar() {
        log.info("Buscando currículo do repositório GitHub");
        Optional<CertificadoPdfDto> curriculo = certificadosPort.obterCurriculo();
        if (curriculo.isPresent()) {
            log.info("Currículo encontrado: {}", curriculo.get().fileName());
        } else {
            log.warn("Currículo não encontrado no repositório");
        }
        return curriculo;
    }

    /**
     * Obtém os bytes do currículo para download/visualização.
     *
     * @return Optional com os bytes do PDF, ou empty se não encontrado
     */
    public Optional<byte[]> obterBytes() {
        return certificadosPort.obterCurriculo()
                .flatMap(curriculo -> certificadosPort.obterPdfBytes(curriculo.fileName()));
    }
}
