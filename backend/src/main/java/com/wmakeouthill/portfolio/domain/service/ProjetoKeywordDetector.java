package com.wmakeouthill.portfolio.domain.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
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
    private static final Map<String, List<String>> PROJETO_KEYWORDS = Map.ofEntries(
        Map.entry("lol-matchmaking-fazenda", List.of(
            "lol", "league of legends", "matchmaking", "fazenda",
            "league", "discord", "discord bot", "match maker", "draft",
            "lcu", "league client", "queue", "fila"
        )),
        Map.entry("aa_space", List.of(
            "aa space", "aa", "alcoolicos anonimos", "comunidade",
            "chat", "forum", "apoio", "recuperação", "suporte",
            "anonimo", "grupos"
        )),
        Map.entry("traffic_manager", List.of(
            "traffic manager", "traffic", "dashboard", "monitoramento",
            "tickets", "servidor", "tempo real", "telemetria", "grafana"
        )),
        Map.entry("investment_calculator", List.of(
            "investment calculator", "calculadora", "investimento",
            "juros compostos", "simulação", "projecao", "roi", "financeiro"
        )),
        Map.entry("mercearia-r-v", List.of(
            "mercearia", "r-v", "caixa", "estoque", "vendas",
            "relatórios", "gestao", "mercado", "varejo", "balcao"
        )),
        Map.entry("first-angular-app", List.of(
            "first angular", "primeiro angular", "angular inicial",
            "primeira app angular", "hello angular"
        )),
        Map.entry("obaid-with-bro", List.of(
            "obaid", "diabo chat", "diabo", "chat obaid", "chatbot obaid"
        )),
        Map.entry("experimenta-ai---soneca", List.of(
            "experimenta ai", "experimenta", "soneca", "lanchonete",
            "pdv", "ponto de venda", "clean architecture", "fullstack",
            "self service", "cardapio digital"
        )),
        Map.entry("lobby-pedidos", List.of(
            "lobby pedidos", "lobby", "pedidos", "comanda",
            "restaurante", "delivery", "fila de pedido"
        )),
        Map.entry("pinta-como-eu-pinto", List.of(
            "pinta como eu pinto", "pinta", "arte", "pintura",
            "brush", "canvas digital"
        )),
        Map.entry("pintarapp", List.of(
            "pintarapp", "pintar app", "canvas", "desenho",
            "paint", "aplicativo de desenho"
        ))
    );
    
    private static final int MAX_DISTANCE = 2;
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
        String mensagemNormalizada = normalizar(mensagemUsuario);
        Set<String> stemsMensagem = extrairStems(mensagemNormalizada);
        Set<String> projetosDetectados = new HashSet<>();
        
        for (Map.Entry<String, List<String>> entry : PROJETO_KEYWORDS.entrySet()) {
            String nomeProjeto = entry.getKey();
            List<String> keywords = entry.getValue();
            
            if (contemPalavraChave(mensagemNormalizada, stemsMensagem, keywords)) {
                projetosDetectados.add(nomeProjeto);
            }
        }
        
        return projetosDetectados;
    }
    
    private boolean contemPalavraChave(String mensagem, Set<String> stemsMensagem, List<String> keywords) {
        for (String keyword : keywords) {
            String chaveNormalizada = normalizar(keyword);
            if (mensagem.contains(chaveNormalizada)) {
                return true;
            }
            String chaveStem = stem(chaveNormalizada);
            if (stemsMensagem.contains(chaveStem) || temSimilaridade(stemsMensagem, chaveStem)) {
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

    private String normalizar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .trim();
    }

    private Set<String> extrairStems(String texto) {
        String[] tokens = texto.split("\\W+");
        Set<String> stems = new HashSet<>();
        for (String token : tokens) {
            if (token.length() > 2) {
                stems.add(stem(token));
            }
        }
        return stems;
    }

    private String stem(String palavra) {
        if (palavra.length() <= 3) {
            return palavra;
        }
        if (palavra.endsWith("ções")) {
            return palavra.substring(0, palavra.length() - 4) + "cao";
        }
        if (palavra.endsWith("es")) {
            return palavra.substring(0, palavra.length() - 2);
        }
        if (palavra.endsWith("s")) {
            return palavra.substring(0, palavra.length() - 1);
        }
        return palavra;
    }

    private boolean temSimilaridade(Set<String> stemsMensagem, String chaveStem) {
        for (String token : stemsMensagem) {
            if (distancia(token, chaveStem) <= MAX_DISTANCE) {
                return true;
            }
        }
        return false;
    }

    private int distancia(String origem, String destino) {
        if (origem.equals(destino)) {
            return 0;
        }
        int[] custos = new int[destino.length() + 1];
        Arrays.setAll(custos, idx -> idx);
        for (int i = 1; i <= origem.length(); i++) {
            int prev = i - 1;
            custos[0] = i;
            for (int j = 1; j <= destino.length(); j++) {
                int temp = custos[j];
                custos[j] = origem.charAt(i - 1) == destino.charAt(j - 1) ? prev
                    : Math.min(Math.min(custos[j - 1], custos[j]), prev) + 1;
                prev = temp;
            }
        }
        return custos[destino.length()];
    }
}

