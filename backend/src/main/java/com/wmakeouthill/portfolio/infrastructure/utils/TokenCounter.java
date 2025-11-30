package com.wmakeouthill.portfolio.infrastructure.utils;

import java.util.List;
import java.util.Map;

/**
 * Utilitário singleton para estimar contagem de tokens para API OpenAI.
 * 
 * Regra geral: ~4 caracteres por token (aproximação da OpenAI).
 * Para textos em português, pode variar entre 3.5-4.5 caracteres por token.
 */
public class TokenCounter {
    
    private static final double CARACTERES_POR_TOKEN = 4.0;
    private static final TokenCounter INSTANCE = new TokenCounter();
    
    private TokenCounter() {
        // Singleton privado
    }
    
    public static TokenCounter getInstance() {
        return INSTANCE;
    }
    
    /**
     * Estima o número de tokens em um texto.
     * 
     * @param texto texto a ser contado
     * @return número estimado de tokens
     */
    public int estimarTokens(String texto) {
        if (texto == null || texto.isBlank()) {
            return 0;
        }
        
        return (int) Math.ceil(texto.length() / CARACTERES_POR_TOKEN);
    }
    
    /**
     * Estima tokens de uma lista de mensagens (formato OpenAI).
     * 
     * @param mensagens lista de mensagens no formato Map com "role" e "content"
     * @return número estimado de tokens
     */
    public int estimarTokensMensagens(List<Map<String, Object>> mensagens) {
        if (mensagens == null || mensagens.isEmpty()) {
            return 0;
        }
        
        int total = 0;
        for (Map<String, Object> mensagem : mensagens) {
            total += estimarTokensMensagem(mensagem);
        }
        
        // Overhead do formato JSON (chaves, aspas, etc.) - aproximação
        int overhead = mensagens.size() * 20; // ~20 tokens de overhead por mensagem
        return total + overhead;
    }
    
    private int estimarTokensMensagem(Map<String, Object> mensagem) {
        if (mensagem == null) {
            return 0;
        }
        
        int tokens = 0;
        
        // Conta tokens do role
        Object role = mensagem.get("role");
        if (role != null) {
            tokens += estimarTokens(role.toString());
        }
        
        // Conta tokens do content
        Object content = mensagem.get("content");
        if (content != null) {
            tokens += estimarTokens(content.toString());
        }
        
        return tokens;
    }
    
    /**
     * Estima tokens de um system prompt.
     * 
     * @param systemPrompt prompt do sistema
     * @return número estimado de tokens
     */
    public int estimarTokensSystemPrompt(String systemPrompt) {
        return estimarTokens(systemPrompt);
    }
    
    /**
     * Estima tokens totais de uma requisição completa para OpenAI.
     * Inclui: system prompt + mensagens + overhead do formato JSON.
     * 
     * @param systemPrompt prompt do sistema
     * @param mensagens lista de mensagens
     * @return número estimado de tokens de entrada
     */
    public int estimarTokensEntrada(String systemPrompt, List<Map<String, Object>> mensagens) {
        int tokensSystemPrompt = estimarTokensSystemPrompt(systemPrompt);
        int tokensMensagens = estimarTokensMensagens(mensagens);
        int overhead = 100; // Overhead geral do formato JSON/payload
        
        return tokensSystemPrompt + tokensMensagens + overhead;
    }
    
    /**
     * Estima tokens de uma resposta da IA.
     * 
     * @param resposta texto da resposta
     * @return número estimado de tokens de saída
     */
    public int estimarTokensResposta(String resposta) {
        return estimarTokens(resposta);
    }
}

