package com.wmakeouthill.portfolio.application.dto;

/**
 * DTO para representar um certificado PDF do repositório GitHub.
 *
 * @param fileName    Nome do arquivo (ex: "Diploma - Bacharel em Direito.pdf")
 * @param displayName Nome formatado para exibição (ex: "Diploma - Bacharel em
 *                    Direito")
 * @param downloadUrl URL para download direto do PDF
 * @param htmlUrl     URL da página do arquivo no GitHub
 * @param size        Tamanho em bytes
 * @param sha         SHA do arquivo (para cache/identificação)
 */
public record CertificadoPdfDto(
        String fileName,
        String displayName,
        String downloadUrl,
        String htmlUrl,
        long size,
        String sha) {
}
