package com.wmakeouthill.portfolio.application.port.out;

import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;

import java.util.List;
import java.util.Optional;

/**
 * Porta de saída para buscar certificados e currículo do repositório GitHub.
 */
public interface CertificadosPort {

    /**
     * Lista todos os certificados (PDFs exceto o currículo).
     *
     * @return lista de certificados ordenados alfabeticamente
     */
    List<CertificadoPdfDto> listarCertificados();

    /**
     * Obtém o currículo do repositório.
     *
     * @return Optional com o currículo, ou empty se não encontrado
     */
    Optional<CertificadoPdfDto> obterCurriculo();

    /**
     * Versão sensível a idioma do currículo.
     * 
     * @param language código de idioma ("pt", "en")
     */
    default Optional<CertificadoPdfDto> obterCurriculo(String language) {
        return obterCurriculo();
    }

    /**
     * Obtém o conteúdo binário de um PDF pelo nome do arquivo.
     *
     * @param fileName nome do arquivo PDF
     * @return Optional com os bytes do PDF, ou empty se não encontrado
     */
    Optional<byte[]> obterPdfBytes(String fileName);
}
