package com.wmakeouthill.portfolio.application.dto;

/**
 * Resposta do chat com informações sobre qual modelo de IA respondeu.
 *
 * @param reply       Texto da resposta
 * @param modelo      Modelo de IA que gerou a resposta (ex: "gemini-2.5-flash",
 *                    "gpt-4o-mini")
 * @param audioBase64 Áudio TTS da resposta em base64 (WAV), quando o usuário
 *                    pediu resposta falada; null caso contrário
 * @param pdfBase64   PDF gerado (ex: currículo personalizado) em base64; null
 *                    caso não haja
 * @param pdfFilename Nome sugerido para o PDF gerado; null caso não haja
 */
public record ChatResponse(
        String reply,
        String modelo,
        String audioBase64,
        String pdfBase64,
        String pdfFilename) {

    /**
     * Construtor de compatibilidade para respostas só com texto.
     */
    public ChatResponse(String reply) {
        this(reply, null, null, null, null);
    }

    /**
     * Construtor de compatibilidade para respostas com texto e modelo.
     */
    public ChatResponse(String reply, String modelo) {
        this(reply, modelo, null, null, null);
    }

    /**
     * Cria uma cópia desta resposta adicionando o áudio TTS.
     */
    public ChatResponse comAudio(String audioBase64) {
        return new ChatResponse(reply, modelo, audioBase64, pdfBase64, pdfFilename);
    }

    /**
     * Cria uma cópia desta resposta adicionando um PDF gerado.
     */
    public ChatResponse comPdf(String pdfBase64, String pdfFilename) {
        return new ChatResponse(reply, modelo, audioBase64, pdfBase64, pdfFilename);
    }
}
