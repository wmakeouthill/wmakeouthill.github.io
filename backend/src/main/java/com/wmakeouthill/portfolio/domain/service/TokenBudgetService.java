package com.wmakeouthill.portfolio.domain.service;

import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import com.wmakeouthill.portfolio.infrastructure.utils.TokenCounter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Serviço para gerenciar o "budget" de tokens, garantindo que as requisições
 * não excedam o limite do modelo.
 * 
 * Estratégia de redução (em ordem de prioridade):
 * 1. Reduz histórico de mensagens (mantém as mais recentes)
 * 2. Reduz contextos de documentação (mantém os mais relevantes)
 * 3. Trunca system prompt se necessário (último recurso)
 */
@Slf4j
@Service
public class TokenBudgetService {

    private static final int MIN_HISTORICO = 2; // Mínimo de mensagens a manter
    private static final int MIN_CONTEXTOS = 1; // Mínimo de contextos a manter

    private final TokenCounter tokenCounter = TokenCounter.getInstance();

    /**
     * Resultado da otimização de tokens.
     */
    public record TokenBudgetResult(
        String systemPromptOtimizado,
        List<MensagemChat> historicoOtimizado,
        int tokensEstimados,
        boolean foiReduzido
    ) {}

    /**
     * Otimiza o histórico e system prompt para caber no limite de tokens.
     * 
     * @param systemPrompt prompt original
     * @param historico histórico completo de mensagens
     * @param mensagemAtual mensagem atual do usuário
     * @return resultado otimizado
     */
    public TokenBudgetResult otimizar(String systemPrompt, List<MensagemChat> historico, String mensagemAtual) {
        int tokensSystemPrompt = tokenCounter.estimarTokens(systemPrompt);
        int tokensMensagemAtual = tokenCounter.estimarTokens(mensagemAtual);
        int tokensHistorico = estimarTokensHistorico(historico);
        int tokensTotal = tokensSystemPrompt + tokensHistorico + tokensMensagemAtual + 100; // overhead

        // Se está dentro do limite, retorna sem alterações
        if (!tokenCounter.precisaReducao(tokensTotal)) {
            return new TokenBudgetResult(systemPrompt, historico, tokensTotal, false);
        }

        log.warn("Tokens estimados ({}) acima do threshold ({}). Iniciando redução...", 
            tokensTotal, TokenCounter.THRESHOLD_REDUCAO);

        // Estratégia 1: Reduzir histórico
        List<MensagemChat> historicoReduzido = reduzirHistorico(historico, tokensTotal, tokensSystemPrompt, tokensMensagemAtual);
        int tokensHistoricoReduzido = estimarTokensHistorico(historicoReduzido);
        tokensTotal = tokensSystemPrompt + tokensHistoricoReduzido + tokensMensagemAtual + 100;

        if (!tokenCounter.precisaReducao(tokensTotal)) {
            log.info("Redução de histórico suficiente. Tokens finais: {}", tokensTotal);
            return new TokenBudgetResult(systemPrompt, historicoReduzido, tokensTotal, true);
        }

        // Estratégia 2: Truncar system prompt (reduzir contextos de documentação)
        String systemPromptReduzido = reduzirSystemPrompt(systemPrompt, tokensTotal);
        int tokensSystemPromptReduzido = tokenCounter.estimarTokens(systemPromptReduzido);
        tokensTotal = tokensSystemPromptReduzido + tokensHistoricoReduzido + tokensMensagemAtual + 100;

        log.info("Redução completa. Tokens finais: {} (system: {}, histórico: {}, mensagem: {})", 
            tokensTotal, tokensSystemPromptReduzido, tokensHistoricoReduzido, tokensMensagemAtual);

        return new TokenBudgetResult(systemPromptReduzido, historicoReduzido, tokensTotal, true);
    }

    /**
     * Reduz o histórico mantendo as mensagens mais recentes.
     */
    private List<MensagemChat> reduzirHistorico(List<MensagemChat> historico, int tokensTotal, 
                                                 int tokensSystemPrompt, int tokensMensagemAtual) {
        if (historico == null || historico.size() <= MIN_HISTORICO) {
            return historico != null ? new ArrayList<>(historico) : new ArrayList<>();
        }

        List<MensagemChat> resultado = new ArrayList<>(historico);
        int tokensParaRemover = tokenCounter.tokensParaRemover(tokensTotal);

        while (resultado.size() > MIN_HISTORICO && tokensParaRemover > 0) {
            // Remove a mensagem mais antiga (índice 0)
            MensagemChat removida = resultado.remove(0);
            int tokensRemovidos = tokenCounter.estimarTokens(removida.content());
            tokensParaRemover -= tokensRemovidos;
            
            log.debug("Removida mensagem do histórico ({} tokens). Restam {} para remover.", 
                tokensRemovidos, Math.max(0, tokensParaRemover));
        }

        log.info("Histórico reduzido de {} para {} mensagens", historico.size(), resultado.size());
        return resultado;
    }

    /**
     * Reduz o system prompt removendo seções de contexto menos importantes.
     * Preserva o prompt base e remove contextos de documentação.
     */
    private String reduzirSystemPrompt(String systemPrompt, int tokensTotal) {
        if (systemPrompt == null || systemPrompt.isBlank()) {
            return systemPrompt;
        }

        // Identifica a seção de contextos do portfólio
        String marcadorContextos = "---\nCONTEXTOS DO PORTFÓLIO:";
        int indiceContextos = systemPrompt.indexOf(marcadorContextos);
        
        if (indiceContextos == -1) {
            // Não tem seção de contextos, trunca o final se necessário
            return truncarSeNecessario(systemPrompt, tokensTotal);
        }

        // Separa o prompt base dos contextos
        String promptBase = systemPrompt.substring(0, indiceContextos);
        String secaoContextos = systemPrompt.substring(indiceContextos);

        // Reduz os contextos pela metade
        String contextosReduzidos = reduzirSecaoContextos(secaoContextos);
        
        String resultado = promptBase + contextosReduzidos;
        
        int tokensResultado = tokenCounter.estimarTokens(resultado);
        log.info("System prompt reduzido de {} para {} tokens", 
            tokenCounter.estimarTokens(systemPrompt), tokensResultado);
        
        return resultado;
    }

    /**
     * Reduz a seção de contextos mantendo apenas os primeiros.
     */
    private String reduzirSecaoContextos(String secaoContextos) {
        String[] partes = secaoContextos.split("(?=### )");
        
        if (partes.length <= MIN_CONTEXTOS + 1) { // +1 pelo header
            return secaoContextos;
        }

        // Mantém header + primeiros contextos
        StringBuilder resultado = new StringBuilder();
        int contextosParaManter = Math.max(MIN_CONTEXTOS, partes.length / 2);
        
        for (int i = 0; i < Math.min(contextosParaManter + 1, partes.length); i++) {
            resultado.append(partes[i]);
        }

        log.debug("Contextos reduzidos de {} para {}", partes.length - 1, contextosParaManter);
        return resultado.toString();
    }

    /**
     * Trunca o texto se ainda estiver acima do limite.
     */
    private String truncarSeNecessario(String texto, int tokensTotal) {
        if (!tokenCounter.excedeLimit(tokensTotal)) {
            return texto;
        }

        // Calcula quantos caracteres manter (80% do limite)
        int caracteresMaximos = (int) (TokenCounter.THRESHOLD_REDUCAO * 4 * 0.8);
        if (texto.length() <= caracteresMaximos) {
            return texto;
        }

        log.warn("Truncando system prompt de {} para {} caracteres", texto.length(), caracteresMaximos);
        return texto.substring(0, caracteresMaximos) + "\n\n[... conteúdo truncado por limite de tokens ...]";
    }

    private int estimarTokensHistorico(List<MensagemChat> historico) {
        if (historico == null || historico.isEmpty()) {
            return 0;
        }
        return historico.stream()
            .mapToInt(msg -> tokenCounter.estimarTokens(msg.content()) + 10) // +10 overhead por msg
            .sum();
    }
}

