package com.wmakeouthill.portfolio.application.port.out;

import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.dto.MediaPart;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;

import java.util.List;

public interface AIChatPort {
    ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual);

    /**
     * Variante multimodal: além do texto, envia anexos de mídia (imagem, áudio,
     * vídeo, documento) inline ao provedor.
     *
     * <p>
     * Implementação padrão ignora a mídia e delega ao método textual, para que
     * adapters que não suportam multimodalidade continuem funcionando.
     * </p>
     */
    default ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual,
            List<MediaPart> media) {
        return chat(systemPrompt, historico, mensagemAtual);
    }
}
