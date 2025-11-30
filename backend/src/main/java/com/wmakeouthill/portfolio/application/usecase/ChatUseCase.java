package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.ChatRequest;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.port.in.GerenciarHistoricoChatPort;
import com.wmakeouthill.portfolio.application.port.out.AIChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import com.wmakeouthill.portfolio.domain.service.PortfolioPromptService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatUseCase {
    private final AIChatPort aiChatPort;
    private final GerenciarHistoricoChatPort gerenciarHistoricoChatPort;
    private final PortfolioPromptService portfolioPromptService;

    public ChatResponse execute(ChatRequest request, String sessionId) {
        String mensagemUsuarioTexto = normalizarMensagem(request);
        if (mensagemUsuarioTexto.isBlank()) {
            return new ChatResponse("");
        }

        if (sessionId == null || sessionId.isBlank()) {
            sessionId = gerarSessionIdFallback();
        }

        MensagemChat mensagemUsuario = MensagemChat.criarMensagemUsuario(mensagemUsuarioTexto);
        gerenciarHistoricoChatPort.adicionarMensagem(sessionId, mensagemUsuario);

        // Carrega system prompt otimizado baseado na mensagem do usuário (on-demand)
        String systemPrompt = portfolioPromptService.obterSystemPromptOtimizado(mensagemUsuarioTexto);
        var historico = gerenciarHistoricoChatPort.obterHistorico(sessionId);

        ChatResponse resposta = aiChatPort.chat(systemPrompt, historico, mensagemUsuarioTexto);
        registrarRespostaNoHistorico(sessionId, resposta);

        return resposta;
    }
    
    private String gerarSessionIdFallback() {
        return "session-" + System.currentTimeMillis() + "-" + 
               Thread.currentThread().getId();
    }

    private String normalizarMensagem(ChatRequest request) {
        String mensagem = request.message();
        if (mensagem == null) {
            return "";
        }
        return mensagem.trim();
    }

    private void registrarRespostaNoHistorico(String sessionId, ChatResponse resposta) {
        if (resposta.reply() == null || resposta.reply().isBlank()) {
            return;
        }
        MensagemChat mensagemAssistente = MensagemChat.criarMensagemAssistente(resposta.reply());
        gerenciarHistoricoChatPort.adicionarMensagem(sessionId, mensagemAssistente);
    }
    
    /**
     * Limpa o histórico de mensagens da sessão especificada.
     * Usado quando o usuário inicia uma nova conversa.
     * 
     * @param sessionId identificador da sessão
     */
    public void limparHistorico(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        gerenciarHistoricoChatPort.limparHistorico(sessionId);
    }
}
