package com.wmakeouthill.portfolio.infrastructure.chat;

import com.wmakeouthill.portfolio.application.port.in.GerenciarHistoricoChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Adaptador para gerenciar o histórico de mensagens do chat em memória.
 */
@Component
public class GerenciarHistoricoChatAdapter implements GerenciarHistoricoChatPort {
    
    private final List<MensagemChat> historico = Collections.synchronizedList(new ArrayList<>());
    
    @Override
    public void adicionarMensagem(MensagemChat mensagem) {
        historico.add(mensagem);
    }
    
    @Override
    public List<MensagemChat> obterHistorico() {
        return new ArrayList<>(historico);
    }
    
    @Override
    public void limparHistorico() {
        historico.clear();
    }
}

