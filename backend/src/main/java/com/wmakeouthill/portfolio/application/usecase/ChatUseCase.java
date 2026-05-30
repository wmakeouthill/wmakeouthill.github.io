package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.ChatRequest;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.dto.MediaPart;
import com.wmakeouthill.portfolio.application.port.in.GerenciarHistoricoChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import com.wmakeouthill.portfolio.domain.service.PortfolioPromptService;
import com.wmakeouthill.portfolio.domain.service.TokenBudgetService;
import com.wmakeouthill.portfolio.domain.service.TokenBudgetService.TokenBudgetResult;
import com.wmakeouthill.portfolio.infrastructure.ai.AIChatRouter;
import com.wmakeouthill.portfolio.infrastructure.ai.GeminiTtsAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatUseCase {
    private final AIChatRouter aiChatRouter;
    private final GerenciarHistoricoChatPort gerenciarHistoricoChatPort;
    private final PortfolioPromptService portfolioPromptService;
    private final TokenBudgetService tokenBudgetService;
    private final GeminiTtsAdapter geminiTtsAdapter;

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

        // Usa o router para selecionar o modelo correto (Gemini ou GPT)
        String modeloSelecionado = request.modeloEfetivo();
        log.info("Modelo de IA selecionado: {}", modeloSelecionado);

        ChatResponse resposta = aiChatRouter.chat(
                budgetResult.systemPromptOtimizado(),
                budgetResult.historicoOtimizado(),
                mensagemUsuarioTexto,
                modeloSelecionado);
        registrarRespostaNoHistorico(sessionId, resposta);

        return resposta;
    }

    /**
     * Variante multimodal: além do texto, processa anexos de mídia (imagem,
     * áudio, vídeo, documento) que são enviados inline ao Gemini.
     *
     * <p>
     * No histórico, guarda apenas a mensagem textual acrescida de placeholders
     * dos anexos, evitando estourar o orçamento de tokens com conteúdo binário.
     * </p>
     */
    public ChatResponse executeMultimodal(ChatRequest request, java.util.List<MediaPart> media,
            String sessionId, String language) {
        return executeMultimodal(request, media, sessionId, language, false);
    }

    public ChatResponse executeMultimodal(ChatRequest request, java.util.List<MediaPart> media,
            String sessionId, String language, boolean audioResponse) {
        java.util.List<MediaPart> anexos = media == null ? java.util.Collections.emptyList() : media;
        String mensagemUsuarioTexto = normalizarMensagem(request);

        if (mensagemUsuarioTexto.isBlank() && anexos.isEmpty()) {
            return new ChatResponse("");
        }

        if (sessionId == null || sessionId.isBlank()) {
            sessionId = gerarSessionIdFallback();
        }

        // Texto persistido no histórico = mensagem + placeholders dos anexos
        String textoHistorico = montarTextoComPlaceholders(mensagemUsuarioTexto, anexos);
        MensagemChat mensagemUsuario = MensagemChat.criarMensagemUsuario(textoHistorico);
        gerenciarHistoricoChatPort.adicionarMensagem(sessionId, mensagemUsuario);

        // Texto enviado à IA: se não houver texto, instrui a analisar os anexos
        String mensagemParaIa = mensagemUsuarioTexto.isBlank()
                ? "Analise o(s) anexo(s) que enviei e responda de forma útil."
                : mensagemUsuarioTexto;

        String systemPrompt = portfolioPromptService.obterSystemPromptOtimizado(mensagemParaIa, language);
        var historico = gerenciarHistoricoChatPort.obterHistorico(sessionId);
        TokenBudgetResult budgetResult = tokenBudgetService.otimizar(systemPrompt, historico, mensagemParaIa);

        ChatResponse resposta = aiChatRouter.chat(
                budgetResult.systemPromptOtimizado(),
                budgetResult.historicoOtimizado(),
                mensagemParaIa,
                request.modeloEfetivo(),
                anexos);
        registrarRespostaNoHistorico(sessionId, resposta);

        return adicionarAudioSeSolicitado(resposta, audioResponse);
    }

    private String montarTextoComPlaceholders(String mensagem, java.util.List<MediaPart> anexos) {
        StringBuilder sb = new StringBuilder(mensagem == null ? "" : mensagem);
        for (MediaPart mp : anexos) {
            if (!sb.isEmpty()) {
                sb.append("\n");
            }
            sb.append(mp.descricaoPlaceholder());
        }
        return sb.toString();
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

    private ChatResponse adicionarAudioSeSolicitado(ChatResponse resposta, boolean audioResponse) {
        if (!audioResponse || resposta.reply() == null || resposta.reply().isBlank()) {
            return resposta;
        }
        return geminiTtsAdapter.sintetizarWavBase64(resposta.reply())
                .map(resposta::comAudio)
                .orElse(resposta);
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
