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

    public ChatResponse execute(ChatRequest request) {
        String mensagemUsuarioTexto = normalizarMensagem(request);
        if (mensagemUsuarioTexto.isBlank()) {
            return new ChatResponse("");
        }

        MensagemChat mensagemUsuario = MensagemChat.criarMensagemUsuario(mensagemUsuarioTexto);
        gerenciarHistoricoChatPort.adicionarMensagem(mensagemUsuario);

        // Carrega system prompt otimizado baseado na mensagem do usuário (on-demand)
        String systemPrompt = portfolioPromptService.obterSystemPromptOtimizado(mensagemUsuarioTexto);
        var historico = gerenciarHistoricoChatPort.obterHistorico();

        ChatResponse resposta = aiChatPort.chat(systemPrompt, historico, mensagemUsuarioTexto);
        registrarRespostaNoHistorico(resposta);

        return resposta;
    }

    private String normalizarMensagem(ChatRequest request) {
        String mensagem = request.message();
        if (mensagem == null) {
            return "";
        }
        return mensagem.trim();
    }

    private void registrarRespostaNoHistorico(ChatResponse resposta) {
        if (resposta.reply() == null || resposta.reply().isBlank()) {
            return;
        }
        MensagemChat mensagemAssistente = MensagemChat.criarMensagemAssistente(resposta.reply());
        gerenciarHistoricoChatPort.adicionarMensagem(mensagemAssistente);
    }
}
