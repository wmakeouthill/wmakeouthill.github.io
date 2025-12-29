package com.wmakeouthill.portfolio.domain.service;

import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;

/**
 * Serviço para detectar projetos relevantes baseado em palavras-chave na
 * mensagem do usuário.
 * Permite carregamento on-demand de markdowns apenas quando mencionados.
 * 
 * ARQUITETURA DINÂMICA: Todos os projetos são descobertos automaticamente
 * do repositório GitHub, sem necessidade de manutenção de listas hardcoded.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjetoKeywordDetector {

    private static final long CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
    private static final int MAX_DISTANCE = 2;

    private final PortfolioContentPort portfolioContentPort;

    /** Cache de projetos (carregados dinamicamente do repositório) */
    private final Map<String, List<String>> projetosCache = new HashMap<>();
    private volatile long ultimoCarregamento = 0;

    @PostConstruct
    void carregarProjetosDinamicos() {
        recarregarProjetosDinamicos();
    }

    /**
     * Recarrega a lista de projetos do repositório GitHub.
     * Todos os projetos são carregados dinamicamente com keywords geradas
     * automaticamente.
     */
    public synchronized void recarregarProjetosDinamicos() {
        log.info("Carregando TODOS os projetos dinamicamente do repositório GitHub...");
        projetosCache.clear();

        List<PortfolioMarkdownResource> recursos = portfolioContentPort.carregarMarkdownsDetalhados();
        for (PortfolioMarkdownResource recurso : recursos) {
            if (recurso.projeto()) {
                String nome = recurso.nome().toLowerCase(Locale.ROOT);
                List<String> keywords = gerarKeywordsDinamicas(nome, recurso.tags());
                projetosCache.put(nome, keywords);
                log.debug("Projeto registrado: {} -> {}", nome, keywords);
            }
        }

        ultimoCarregamento = System.currentTimeMillis();
        log.info("Projetos carregados dinamicamente: {} projetos encontrados", projetosCache.size());
    }

    /**
     * Gera keywords automaticamente a partir do nome do projeto e suas tags.
     * Ex: "lol-matchmaking-fazenda" -> ["lol", "matchmaking", "fazenda", "lol
     * matchmaking fazenda"]
     */
    private List<String> gerarKeywordsDinamicas(String nome, Set<String> tags) {
        List<String> keywords = new ArrayList<>();
        keywords.add(nome);

        // Adiciona variações do nome
        keywords.add(nome.replace("-", " "));
        keywords.add(nome.replace("_", " "));
        keywords.add(nome.replace("-", "").replace("_", ""));

        // Extrai cada palavra do nome como keyword individual
        String[] partes = nome.split("[-_]+");
        for (String parte : partes) {
            if (parte.length() > 2 && !keywords.contains(parte)) {
                keywords.add(parte);
            }
        }

        // Adiciona tags como keywords
        if (tags != null) {
            for (String tag : tags) {
                if (!keywords.contains(tag)) {
                    keywords.add(tag);
                }
            }
        }

        return keywords;
    }

    private void verificarCacheExpirado() {
        if (System.currentTimeMillis() - ultimoCarregamento > CACHE_TTL_MS) {
            recarregarProjetosDinamicos();
        }
    }

    /**
     * Obtém todas as keywords (100% dinâmicas do GitHub).
     */
    private Map<String, List<String>> obterTodasKeywords() {
        verificarCacheExpirado();
        return new HashMap<>(projetosCache);
    }

    /**
     * Detecta quais projetos são relevantes baseado na mensagem do usuário.
     * Usa keywords 100% dinâmicas carregadas do repositório GitHub.
     * 
     * @param mensagemUsuario mensagem do usuário
     * @return conjunto de nomes de projetos relevantes (nomes normalizados dos
     *         arquivos)
     */
    public Set<String> detectarProjetosRelevantes(String mensagemUsuario) {
        if (mensagemUsuario == null || mensagemUsuario.isBlank()) {
            return Collections.emptySet();
        }
        String mensagemNormalizada = normalizar(mensagemUsuario);
        Set<String> stemsMensagem = extrairStems(mensagemNormalizada);
        Set<String> projetosDetectados = new HashSet<>();

        // Busca em todas as keywords (estáticas + dinâmicas)
        Map<String, List<String>> todasKeywords = obterTodasKeywords();

        for (Map.Entry<String, List<String>> entry : todasKeywords.entrySet()) {
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
     * Retorna todos os nomes de projetos disponíveis (estáticos + dinâmicos).
     * 
     * @return conjunto de todos os nomes de projetos
     */
    public Set<String> obterTodosProjetos() {
        return obterTodasKeywords().keySet();
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
