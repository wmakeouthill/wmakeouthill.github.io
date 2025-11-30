package com.wmakeouthill.portfolio.application.port.in;

import com.wmakeouthill.portfolio.domain.entity.MensagemChat;

import java.util.List;

/**
 * Porta de entrada para gerenciar o histórico de mensagens do chat.
 * Histórico é separado por sessão para isolar conversas de diferentes usuários/navegadores.
 */
public interface GerenciarHistoricoChatPort {
    
    /**
     * Adiciona uma mensagem ao histórico da sessão especificada.
     * 
     * @param sessionId identificador único da sessão/navegador
     * @param mensagem mensagem a ser adicionada
     */
    void adicionarMensagem(String sessionId, MensagemChat mensagem);
    
    /**
     * Obtém o histórico de mensagens da sessão especificada.
     * Retorna apenas as últimas N mensagens para otimização de tokens.
     * 
     * @param sessionId identificador único da sessão/navegador
     * @return lista de mensagens do histórico (máximo N mensagens)
     */
    List<MensagemChat> obterHistorico(String sessionId);
    
    /**
     * Limpa o histórico de mensagens da sessão especificada.
     * Útil quando usuário inicia nova conversa.
     * 
     * @param sessionId identificador único da sessão/navegador
     */
    void limparHistorico(String sessionId);
}

