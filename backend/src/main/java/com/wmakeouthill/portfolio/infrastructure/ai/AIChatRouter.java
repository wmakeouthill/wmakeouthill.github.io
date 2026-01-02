package com.wmakeouthill.portfolio.infrastructure.ai;

import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.port.out.AIChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Router que permite selecionar entre Gemini e GPT em tempo de execução.
 * 
 * <p>
 * Quando ambos os adapters estão disponíveis, roteia a requisição
 * para o adapter correto baseado no modelo solicitado.
 * </p>
 * 
 * <p>
 * Se apenas um adapter estiver disponível, usa-o independente do modelo
 * solicitado.
 * </p>
 */
@Slf4j
@Component
public class AIChatRouter implements AIChatPort {

    private final AIChatPort geminiAdapter;
    private final AIChatPort openaiAdapter;

    @Autowired
    public AIChatRouter(
            @Autowired(required = false) GeminiAdapter geminiAdapter,
            @Autowired(required = false) OpenAIAdapter openaiAdapter) {
        this.geminiAdapter = geminiAdapter;
        this.openaiAdapter = openaiAdapter;

        log.info("AIChatRouter configurado - Gemini: {}, OpenAI: {}",
                geminiAdapter != null ? "disponível" : "indisponível",
                openaiAdapter != null ? "disponível" : "indisponível");
    }

    /**
     * Roteia para o adapter apropriado baseado no modelo.
     * Usa Gemini como padrão.
     */
    public ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual, String modelo) {
        boolean useGpt = "gpt".equalsIgnoreCase(modelo) || "openai".equalsIgnoreCase(modelo);

        if (useGpt) {
            if (openaiAdapter != null) {
                log.info("Roteando para OpenAI/GPT (modelo solicitado: {})", modelo);
                return openaiAdapter.chat(systemPrompt, historico, mensagemAtual);
            } else {
                log.warn("GPT solicitado mas OpenAI adapter não disponível. Fallback para Gemini.");
            }
        }

        // Padrão: Gemini
        if (geminiAdapter != null) {
            log.info("Roteando para Gemini (modelo solicitado: {})", modelo);
            return geminiAdapter.chat(systemPrompt, historico, mensagemAtual);
        }

        // Último fallback: OpenAI se Gemini não disponível
        if (openaiAdapter != null) {
            log.warn("Gemini não disponível. Fallback para OpenAI.");
            return openaiAdapter.chat(systemPrompt, historico, mensagemAtual);
        }

        return new ChatResponse("Nenhum provedor de IA configurado. Configure GEMINI_API_KEY ou OPENAI_API_KEY.");
    }

    /**
     * Método padrão do AIChatPort - usa Gemini como padrão.
     */
    @Override
    public ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual) {
        return chat(systemPrompt, historico, mensagemAtual, "gemini");
    }

    /**
     * Verifica se Gemini está disponível.
     */
    public boolean isGeminiDisponivel() {
        return geminiAdapter != null;
    }

    /**
     * Verifica se GPT/OpenAI está disponível.
     */
    public boolean isGptDisponivel() {
        return openaiAdapter != null;
    }
}
