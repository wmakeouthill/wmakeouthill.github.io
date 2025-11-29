package com.wmakeouthill.portfolio.application.port.in;

import com.wmakeouthill.portfolio.domain.entity.MensagemChat;

import java.util.List;

/**
 * Porta de entrada para gerenciar o histórico de mensagens do chat.
 */
public interface GerenciarHistoricoChatPort {
    
    void adicionarMensagem(MensagemChat mensagem);
    
    List<MensagemChat> obterHistorico();
    
    void limparHistorico();
}

