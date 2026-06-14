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
 * @param curriculoDisponivel quando true, sinaliza ao frontend que a mensagem
 *                    pede um currículo e que ele pode ser gerado sob demanda
 *                    (via POST /api/chat/curriculo) — evita disparar a 2ª
 *                    chamada ao Vertex dentro da requisição do chat
 */
public record ChatResponse(
        String reply,
        String modelo,
        String audioBase64,
        String pdfBase64,
        String pdfFilename,
        boolean curriculoDisponivel) {

    /**
     * Construtor de compatibilidade para respostas só com texto.
     */
    public ChatResponse(String reply) {
        this(reply, null, null, null, null, false);
    }

    /**
     * Construtor de compatibilidade para respostas com texto e modelo.
     */
    public ChatResponse(String reply, String modelo) {
        this(reply, modelo, null, null, null, false);
    }

    /**
     * Construtor de compatibilidade (sem a flag de currículo disponível).
     */
    public ChatResponse(String reply, String modelo, String audioBase64, String pdfBase64, String pdfFilename) {
        this(reply, modelo, audioBase64, pdfBase64, pdfFilename, false);
    }

    /**
     * Cria uma cópia desta resposta adicionando o áudio TTS.
     */
    public ChatResponse comAudio(String audioBase64) {
        return new ChatResponse(reply, modelo, audioBase64, pdfBase64, pdfFilename, curriculoDisponivel);
    }

    /**
     * Cria uma cópia desta resposta adicionando um PDF gerado.
     */
    public ChatResponse comPdf(String pdfBase64, String pdfFilename) {
        return new ChatResponse(reply, modelo, audioBase64, pdfBase64, pdfFilename, curriculoDisponivel);
    }

    /**
     * Cria uma cópia desta resposta sinalizando que um currículo pode ser gerado.
     */
    public ChatResponse comCurriculoDisponivel() {
        return new ChatResponse(reply, modelo, audioBase64, pdfBase64, pdfFilename, true);
    }
}
