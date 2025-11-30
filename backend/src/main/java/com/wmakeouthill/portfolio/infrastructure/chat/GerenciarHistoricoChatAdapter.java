package com.wmakeouthill.portfolio.infrastructure.chat;

import com.wmakeouthill.portfolio.application.port.in.GerenciarHistoricoChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Adaptador para gerenciar o histórico de mensagens do chat em memória.
 * Mantém histórico separado por sessão para isolar conversas de diferentes usuários/navegadores.
 * Retorna apenas as últimas N mensagens para otimização de tokens.
 * 
 * Implementa limpeza automática de sessões antigas para economia de memória.
 */
@Slf4j
@Component
public class GerenciarHistoricoChatAdapter implements GerenciarHistoricoChatPort {
    
    /**
     * Número máximo de mensagens do histórico a serem enviadas para a IA.
     * Limita o uso de tokens mantendo apenas o contexto mais recente.
     */
    private static final int MAX_HISTORICO_MENSAGENS = 10;
    
    /**
     * Tempo em minutos para considerar uma sessão como inativa e removê-la.
     * Reduz uso de memória limpando sessões antigas automaticamente.
     */
    private static final int TTL_SESSAO_MINUTOS = 30;
    
    /**
     * Histórico separado por sessão.
     * Key: Session ID (identificador único do navegador/sessão)
     * Value: Lista de mensagens da sessão
     */
    private final Map<String, List<MensagemChat>> historicoPorSessao = new ConcurrentHashMap<>();
    
    /**
     * Registro de última atividade por sessão para limpeza automática.
     * Key: Session ID
     * Value: Timestamp da última atividade
     */
    private final Map<String, LocalDateTime> ultimaAtividadePorSessao = new ConcurrentHashMap<>();
    
    @Override
    public void adicionarMensagem(String sessionId, MensagemChat mensagem) {
        if (sessionId == null || sessionId.isBlank()) {
            log.warn("Tentativa de adicionar mensagem sem sessionId - ignorando");
            return;
        }
        
        atualizarAtividade(sessionId);
        
        List<MensagemChat> historico = historicoPorSessao.computeIfAbsent(
            sessionId, 
            k -> Collections.synchronizedList(new ArrayList<>())
        );
        
        historico.add(mensagem);
        log.debug("Mensagem adicionada ao histórico da sessão {} (total: {})", sessionId, historico.size());
    }
    
    @Override
    public List<MensagemChat> obterHistorico(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            log.warn("Tentativa de obter histórico sem sessionId - retornando vazio");
            return new ArrayList<>();
        }
        
        limparSessoesAntigas();
        
        List<MensagemChat> historico = historicoPorSessao.get(sessionId);
        if (historico == null || historico.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<MensagemChat> historicoCompleto = new ArrayList<>(historico);
        
        if (historicoCompleto.size() <= MAX_HISTORICO_MENSAGENS) {
            return historicoCompleto;
        }
        
        return obterUltimasMensagens(historicoCompleto);
    }
    
    @Override
    public void limparHistorico(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            log.warn("Tentativa de limpar histórico sem sessionId - ignorando");
            return;
        }
        
        List<MensagemChat> removido = historicoPorSessao.remove(sessionId);
        ultimaAtividadePorSessao.remove(sessionId);
        
        if (removido != null) {
            log.info("Histórico da sessão {} limpo ({} mensagens removidas)", sessionId, removido.size());
        }
    }
    
    private List<MensagemChat> obterUltimasMensagens(List<MensagemChat> historicoCompleto) {
        int tamanho = historicoCompleto.size();
        int inicio = Math.max(0, tamanho - MAX_HISTORICO_MENSAGENS);
        return new ArrayList<>(historicoCompleto.subList(inicio, tamanho));
    }
    
    private void atualizarAtividade(String sessionId) {
        ultimaAtividadePorSessao.put(sessionId, LocalDateTime.now());
    }
    
    /**
     * Remove sessões que não foram usadas há mais de TTL_SESSAO_MINUTOS.
     * Executado automaticamente ao acessar histórico para economia de memória.
     */
    private void limparSessoesAntigas() {
        List<String> sessoesParaRemover = identificarSessoesAntigas();
        removerSessoes(sessoesParaRemover);
    }
    
    private List<String> identificarSessoesAntigas() {
        LocalDateTime agora = LocalDateTime.now();
        List<String> sessoesParaRemover = new ArrayList<>();
        
        for (Map.Entry<String, LocalDateTime> entry : ultimaAtividadePorSessao.entrySet()) {
            String sessionId = entry.getKey();
            LocalDateTime ultimaAtividade = entry.getValue();
            
            if (ultimaAtividade.plusMinutes(TTL_SESSAO_MINUTOS).isBefore(agora)) {
                sessoesParaRemover.add(sessionId);
            }
        }
        
        return sessoesParaRemover;
    }
    
    private void removerSessoes(List<String> sessoesParaRemover) {
        for (String sessionId : sessoesParaRemover) {
            historicoPorSessao.remove(sessionId);
            ultimaAtividadePorSessao.remove(sessionId);
            log.debug("Sessão {} removida por inatividade (TTL: {} minutos)", sessionId, TTL_SESSAO_MINUTOS);
        }
        
        if (!sessoesParaRemover.isEmpty()) {
            log.info("{} sessões antigas removidas automaticamente", sessoesParaRemover.size());
        }
    }
}

