package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;
import com.wmakeouthill.portfolio.application.port.out.CertificadosPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Caso de uso para listar certificados do repositório GitHub.
 * Retorna apenas certificados (exclui o currículo).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListarCertificadosUseCase {

    private final CertificadosPort certificadosPort;

    /**
     * Lista todos os certificados disponíveis.
     *
     * @return lista de certificados ordenados alfabeticamente
     */
    public List<CertificadoPdfDto> executar() {
        log.info("Listando certificados do repositório GitHub");
        List<CertificadoPdfDto> certificados = certificadosPort.listarCertificados();
        log.info("Encontrados {} certificados", certificados.size());
        return certificados;
    }
}
