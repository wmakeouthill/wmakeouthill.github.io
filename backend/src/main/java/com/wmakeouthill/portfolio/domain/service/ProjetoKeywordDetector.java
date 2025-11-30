package com.wmakeouthill.portfolio.domain.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Serviço para detectar projetos relevantes baseado em palavras-chave na mensagem do usuário.
 * Permite carregamento on-demand de markdowns apenas quando mencionados.
 */
@Service
@RequiredArgsConstructor
public class ProjetoKeywordDetector {
    
    /**
     * Mapeamento de projetos para suas palavras-chave.
     * Chave: nome normalizado do arquivo markdown (sem .md)
     * Valor: lista de palavras-chave (case-insensitive)
     */
    private static final Map<String, List<String>> PROJETO_KEYWORDS = Map.of(
        "lol-matchmaking-fazenda", List.of(
            "lol", "league of legends", "matchmaking", "fazenda", 
            "league", "discord bot", "lcu", "league client"
        ),
        "aa_space", List.of(
            "aa space", "aa", "comunidade", "chat", "forum", 
            "suporte", "recuperação", "anônimo", "reuniões"
        ),
        "traffic_manager", List.of(
            "traffic manager", "traffic", "dashboard", "monitoramento",
            "tickets", "servidor", "tempo real"
        ),
        "investment_calculator", List.of(
            "investment calculator", "calculadora", "investimento",
            "juros compostos", "simulação", "projeção"
        ),
        "mercearia-r-v", List.of(
            "mercearia", "r-v", "caixa", "estoque", "vendas",
            "relatórios", "gestão", "pontuação"
        ),
        "first-angular-app", List.of(
            "first angular", "primeiro angular", "angular inicial",
            "primeira app angular"
        ),
        "obaid-with-bro", List.of(
            "obaid", "diabo chat", "diabo", "chat obaid"
        )
    );
    
    /**
     * Detecta quais projetos são relevantes baseado na mensagem do usuário.
     * 
     * @param mensagemUsuario mensagem do usuário
     * @return conjunto de nomes de projetos relevantes (nomes normalizados dos arquivos)
     */
    public Set<String> detectarProjetosRelevantes(String mensagemUsuario) {
        if (mensagemUsuario == null || mensagemUsuario.isBlank()) {
            return Collections.emptySet();
        }
        
        String mensagemLower = mensagemUsuario.toLowerCase().trim();
        Set<String> projetosDetectados = new HashSet<>();
        
        for (Map.Entry<String, List<String>> entry : PROJETO_KEYWORDS.entrySet()) {
            String nomeProjeto = entry.getKey();
            List<String> keywords = entry.getValue();
            
            if (contemPalavraChave(mensagemLower, keywords)) {
                projetosDetectados.add(nomeProjeto);
            }
        }
        
        return projetosDetectados;
    }
    
    private boolean contemPalavraChave(String mensagem, List<String> keywords) {
        for (String keyword : keywords) {
            if (mensagem.contains(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Verifica se algum projeto foi mencionado na mensagem.
     * 
     * @param mensagemUsuario mensagem do usuário
     * @return true se algum projeto foi detectado
     */
    public boolean temProjetoMencionado(String mensagemUsuario) {
        return !detectarProjetosRelevantes(mensagemUsuario).isEmpty();
    }
    
    /**
     * Retorna todos os nomes de projetos disponíveis.
     * 
     * @return conjunto de todos os nomes de projetos
     */
    public Set<String> obterTodosProjetos() {
        return PROJETO_KEYWORDS.keySet();
    }
}

