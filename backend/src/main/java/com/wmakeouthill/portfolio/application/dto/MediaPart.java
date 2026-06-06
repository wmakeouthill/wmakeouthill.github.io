package com.wmakeouthill.portfolio.application.dto;

/**
 * Representa um anexo de mídia (imagem, áudio, vídeo, PDF, documento) enviado
 * pelo usuário ao chat, já codificado em base64 para envio inline ao provedor
 * multimodal (Gemini).
 *
 * @param mimeType   tipo MIME do conteúdo (ex: "audio/webm", "application/pdf")
 * @param base64Data conteúdo do arquivo em base64 (sem prefixo data:)
 * @param nomeArquivo nome original do arquivo (para placeholder no histórico)
 */
public record MediaPart(String mimeType, String base64Data, String nomeArquivo) {

    public boolean isVideo() {
        return mimeType != null && mimeType.startsWith("video/");
    }

    public boolean isAudio() {
        return mimeType != null && mimeType.startsWith("audio/");
    }

    public boolean isImagem() {
        return mimeType != null && mimeType.startsWith("image/");
    }

    /**
     * Texto curto usado como placeholder no histórico, evitando guardar o
     * conteúdo binário (que estouraria o orçamento de tokens).
     */
    public String descricaoPlaceholder() {
        String nome = (nomeArquivo == null || nomeArquivo.isBlank()) ? "arquivo" : nomeArquivo;
        if (isVideo()) {
            return "[vídeo enviado: " + nome + "]";
        }
        if (isAudio()) {
            return "[áudio enviado: " + nome + "]";
        }
        if (isImagem()) {
            return "[imagem enviada: " + nome + "]";
        }
        return "[documento enviado: " + nome + "]";
    }
}
