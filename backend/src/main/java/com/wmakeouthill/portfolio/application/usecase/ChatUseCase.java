package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.ChatRequest;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.port.in.GerenciarHistoricoChatPort;
import com.wmakeouthill.portfolio.application.port.out.AIChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import com.wmakeouthill.portfolio.domain.service.PortfolioPromptService;
import com.wmakeouthill.portfolio.domain.service.TokenBudgetService;
import com.wmakeouthill.portfolio.domain.service.TokenBudgetService.TokenBudgetResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatUseCase {
    private final AIChatPort aiChatPort;
    private final GerenciarHistoricoChatPort gerenciarHistoricoChatPort;
    private final PortfolioPromptService portfolioPromptService;
    private final TokenBudgetService tokenBudgetService;

    public ChatResponse execute(ChatRequest request, String sessionId, String language) {
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
        String systemPrompt = portfolioPromptService.obterSystemPromptOtimizado(mensagemUsuarioTexto, language);
        var historico = gerenciarHistoricoChatPort.obterHistorico(sessionId);

        // Otimiza tokens se necessário (reduz histórico/contextos se perto do limite)
        TokenBudgetResult budgetResult = tokenBudgetService.otimizar(systemPrompt, historico, mensagemUsuarioTexto);

        if (budgetResult.foiReduzido()) {
            log.info("Token budget otimizado: {} tokens estimados", budgetResult.tokensEstimados());
        }

        ChatResponse resposta = aiChatPort.chat(
                budgetResult.systemPromptOtimizado(),
                budgetResult.historicoOtimizado(),
                mensagemUsuarioTexto);
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
