package com.wmakeouthill.portfolio.infrastructure.chat;

import com.wmakeouthill.portfolio.application.port.in.GerenciarHistoricoChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Adaptador para gerenciar o histórico de mensagens do chat em memória.
 * Mantém histórico completo, mas retorna apenas as últimas N mensagens para otimização de tokens.
 */
@Component
public class GerenciarHistoricoChatAdapter implements GerenciarHistoricoChatPort {
    
    /**
     * Número máximo de mensagens do histórico a serem enviadas para a IA.
     * Limita o uso de tokens mantendo apenas o contexto mais recente.
     */
    private static final int MAX_HISTORICO_MENSAGENS = 10;
    
    private final List<MensagemChat> historico = Collections.synchronizedList(new ArrayList<>());
    
    @Override
    public void adicionarMensagem(MensagemChat mensagem) {
        historico.add(mensagem);
    }
    
    @Override
    public List<MensagemChat> obterHistorico() {
        List<MensagemChat> historicoCompleto = new ArrayList<>(historico);
        
        if (historicoCompleto.size() <= MAX_HISTORICO_MENSAGENS) {
            return historicoCompleto;
        }
        
        return obterUltimasMensagens(historicoCompleto);
    }
    
    private List<MensagemChat> obterUltimasMensagens(List<MensagemChat> historicoCompleto) {
        int tamanho = historicoCompleto.size();
        int inicio = Math.max(0, tamanho - MAX_HISTORICO_MENSAGENS);
        return new ArrayList<>(historicoCompleto.subList(inicio, tamanho));
    }
    
    @Override
    public void limparHistorico() {
        historico.clear();
    }
}

