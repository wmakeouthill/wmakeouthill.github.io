package com.wmakeouthill.portfolio.application.dto;

/**
 * Estado de um job assíncrono de geração de currículo.
 *
 * <p>
 * A geração roda em background no backend (que é uma instância sempre ligada),
 * desacoplada do teto de ~60s do proxy/Vercel: o POST inicia o job e responde na
 * hora; o frontend faz polling deste estado via GET até {@code status} sair de
 * {@code PENDING}.
 * </p>
 *
 * @param jobId       identificador do job
 * @param status      "PENDING" | "DONE" | "ERROR"
 * @param pdfBase64   PDF gerado em base64 quando status == DONE; null caso contrário
 * @param pdfFilename nome sugerido do PDF quando pronto; null caso contrário
 * @param error       mensagem amigável de erro quando status == ERROR; null caso contrário
 */
public record CurriculoJobResponse(
        String jobId,
        String status,
        String pdfBase64,
        String pdfFilename,
        String error) {
}
