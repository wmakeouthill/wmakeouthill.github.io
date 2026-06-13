package com.wmakeouthill.portfolio.domain.service;

import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
import com.wmakeouthill.portfolio.infrastructure.utils.TokenCounter;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContextSearchService {

  private static final int MAX_FALLBACK = 5;
  private static final double MIN_SCORE = 0.4;

  private static final Set<String> STOPWORDS = Set.of(
      // PT - preposições, artigos, pronomes, conjunções (só as com >2 chars que passam no filtro)
      "dos", "das", "nos", "nas", "uns", "uma", "umas", "que", "por",
      "para", "com", "sem", "ate", "sob", "lhe", "vos", "lhes", "seu",
      "sua", "meu", "minha", "como", "mais", "mas", "nem", "quando",
      "onde", "quem", "qual",
      // EN - stopwords comuns com >2 chars
      "the", "and", "for", "are", "was", "were", "been", "have", "has",
      "had", "does", "did", "will", "can", "your", "his", "her", "its",
      "our", "their", "from", "with", "this", "that", "they", "them",
      "not", "but", "what", "who", "how", "about"
  );

  private static final long CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

  private final PortfolioContentPort portfolioContentPort;
  private final MarkdownPassageSplitter passageSplitter;
  private final TokenCounter tokenCounter = TokenCounter.getInstance();

  private final List<ContextChunk> contextChunks = new ArrayList<>();
  private final List<ContextChunk> fallbackChunks = new ArrayList<>();
  private volatile long ultimoCarregamento = 0;
  private String idiomaAtual = "pt";

  @PostConstruct
  void carregarContextos() {
    recarregarContextos("pt");
  }

  /**
   * Recarrega os contextos do repositório GitHub.
   * Chamado automaticamente se o cache expirou.
   */
  public synchronized void recarregarContextos(String language) {
    String idioma = normalizarIdioma(language);
    log.info("Recarregando contextos do repositório GitHub (lang={})...", idioma);
    List<PortfolioMarkdownResource> recursos = portfolioContentPort.carregarMarkdownsDetalhados(idioma);
    contextChunks.clear();
    int indice = 0;
    for (PortfolioMarkdownResource recurso : recursos) {
      Set<String> tagStems = normalizarTags(recurso.tags());
      // Fatiar cada documento em passagens: a busca recupera só os trechos
      // relevantes, em vez do arquivo inteiro (que inflava o prompt a ~70k tokens).
      for (String passagem : passageSplitter.dividir(recurso.conteudo())) {
        String conteudo = "「" + recurso.nome() + "」\n" + passagem;
        contextChunks.add(new ContextChunk(
            recurso.nome() + "-" + indice++,
            conteudo,
            extrairStems(passagem),
            recurso.projeto(),
            recurso.preferencialFallback(),
            tagStems));
      }
    }
    atualizarFallback();
    ultimoCarregamento = System.currentTimeMillis();
    idiomaAtual = idioma;
    log.info("Contextos recarregados: {} chunks disponíveis", contextChunks.size());
  }

  /**
   * Verifica se o cache expirou e recarrega se necessário.
   */
  public synchronized void invalidarCache() {
    contextChunks.clear();
    fallbackChunks.clear();
    ultimoCarregamento = 0;
    log.info("Cache de contextos da IA invalidado");
  }

  private void verificarCacheExpirado(String idioma) {
    String idiomaNorm = normalizarIdioma(idioma);
    if (!idiomaNorm.equals(idiomaAtual) || System.currentTimeMillis() - ultimoCarregamento > CACHE_TTL_MS) {
      log.debug("Cache de contextos expirado ou idioma mudou ({} -> {}), recarregando...", idiomaAtual, idiomaNorm);
      recarregarContextos(idiomaNorm);
    }
  }

  /**
   * Recupera as passagens mais relevantes para a mensagem, respeitando dois
   * limites: número máximo de passagens e teto de tokens acumulados. Garante ao
   * menos a passagem mais relevante quando há match (mesmo que ela sozinha
   * exceda o orçamento), para nunca devolver contexto vazio à toa.
   *
   * @param mensagem        pergunta do usuário
   * @param maxPassagens    teto de passagens
   * @param orcamentoTokens teto de tokens estimados acumulados
   * @param language        idioma ("pt" | "en")
   */
  public List<String> buscarContextos(String mensagem, int maxPassagens, int orcamentoTokens, String language) {
    // Verifica se precisa recarregar contextos
    verificarCacheExpirado(language);

    List<String> tokens = tokenizar(mensagem);
    List<ContextChunk> selecionados;
    if (tokens.isEmpty()) {
      selecionados = obterFallback();
    } else {
      List<ContextChunk> ranqueados = ranquear(tokens);
      selecionados = ranqueados.isEmpty() ? obterFallback() : ranqueados;
    }
    return limitarPorOrcamento(selecionados, maxPassagens, orcamentoTokens);
  }

  private List<ContextChunk> ranquear(List<String> tokens) {
    return contextChunks.stream()
        .map(chunk -> new ScoredChunk(chunk, calcularScore(chunk, tokens)))
        .filter(pontuado -> pontuado.score >= MIN_SCORE)
        .sorted(Comparator.comparingDouble(ScoredChunk::score).reversed())
        .map(ScoredChunk::chunk)
        .toList();
  }

  private double calcularScore(ContextChunk chunk, List<String> tokens) {
    double total = 0;
    for (String token : tokens) {
      if (chunk.stems.contains(token)) {
        total += 2;
        continue;
      }
      if (temSimilaridade(token, chunk.stems)) {
        total += 1;
      }
    }
    double baseScore = total / tokens.size();
    double tagBoost = calcularTagBoost(chunk, tokens);
    return baseScore + tagBoost;
  }

  private double calcularTagBoost(ContextChunk chunk, List<String> tokens) {
    if (chunk.tagStems.isEmpty()) {
      return 0;
    }
    long matches = tokens.stream()
        .filter(chunk.tagStems::contains)
        .count();
    if (matches == 0) {
      return 0;
    }
    return 1 + (matches - 1) * 0.25;
  }

  private boolean temSimilaridade(String token, Set<String> stems) {
    Predicate<String> similar = stem -> {
      int distancia = calcularLevenshtein(token, stem);
      return distancia <= 2 && distancia < token.length();
    };
    return stems.stream().anyMatch(similar);
  }

  private int calcularLevenshtein(String origem, String destino) {
    if (origem.equals(destino)) {
      return 0;
    }
    int[] custos = new int[destino.length() + 1];
    for (int j = 0; j <= destino.length(); j++) {
      custos[j] = j;
    }
    for (int i = 1; i <= origem.length(); i++) {
      int prev = i - 1;
      custos[0] = i;
      for (int j = 1; j <= destino.length(); j++) {
        int temp = custos[j];
        if (origem.charAt(i - 1) == destino.charAt(j - 1)) {
          custos[j] = prev;
        } else {
          int insercao = custos[j - 1];
          int delecao = custos[j];
          custos[j] = Math.min(Math.min(insercao, delecao), prev) + 1;
        }
        prev = temp;
      }
    }
    return custos[destino.length()];
  }

  private List<String> tokenizar(String mensagem) {
    if (mensagem == null || mensagem.isBlank()) {
      return List.of();
    }
    return Arrays.stream(mensagem.split("\\W+"))
        .map(this::stemming)
        .filter(token -> token.length() > 2)
        .filter(token -> !STOPWORDS.contains(token))
        .distinct()
        .collect(Collectors.toList());
  }

  private Set<String> extrairStems(String texto) {
    return Arrays.stream(texto.split("\\W+"))
        .map(this::stemming)
        .filter(token -> token.length() > 2)
        .collect(Collectors.toSet());
  }

  private Set<String> normalizarTags(Set<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return Set.of();
    }
    return tags.stream()
        .map(this::stemming)
        .collect(Collectors.toSet());
  }

  private String stemming(String palavra) {
    String normalizada = normalize(palavra);
    if (normalizada.length() <= 3) {
      return normalizada;
    }
    if (normalizada.endsWith("ções")) {
      return normalizada.substring(0, normalizada.length() - 4) + "cao";
    }
    if (normalizada.endsWith("s")) {
      return normalizada.substring(0, normalizada.length() - 1);
    }
    if (normalizada.endsWith("es")) {
      return normalizada.substring(0, normalizada.length() - 2);
    }
    return normalizada;
  }

  private String normalizarIdioma(String language) {
    if (language == null || language.isBlank()) {
      return "pt";
    }
    String lower = language.toLowerCase(Locale.ROOT);
    return lower.startsWith("en") ? "en" : "pt";
  }

  private String normalize(String palavra) {
    String semAcento = Normalizer.normalize(palavra, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "");
    return semAcento.toLowerCase(Locale.ROOT);
  }

  private List<ContextChunk> obterFallback() {
    if (!fallbackChunks.isEmpty()) {
      return List.copyOf(fallbackChunks);
    }
    return contextChunks.stream()
        .limit(MAX_FALLBACK)
        .toList();
  }

  private void atualizarFallback() {
    fallbackChunks.clear();
    contextChunks.stream()
        .filter(ContextChunk::preferencialFallback)
        .limit(MAX_FALLBACK)
        .forEach(fallbackChunks::add);
    if (fallbackChunks.size() < MAX_FALLBACK) {
      contextChunks.stream()
          .filter(chunk -> !chunk.projeto && !fallbackChunks.contains(chunk))
          .limit(MAX_FALLBACK - fallbackChunks.size())
          .forEach(fallbackChunks::add);
    }
  }

  /**
   * Acumula passagens (já ordenadas por relevância) respeitando dois tetos: número
   * de passagens e tokens acumulados. A passagem mais relevante é sempre incluída,
   * mesmo que sozinha estoure o orçamento — evita devolver contexto vazio quando há
   * match. As demais só entram se couberem no orçamento restante.
   */
  private List<String> limitarPorOrcamento(List<ContextChunk> chunks, int maxPassagens, int orcamentoTokens) {
    List<String> resultado = new ArrayList<>();
    int tokensUsados = 0;
    for (ContextChunk chunk : chunks) {
      if (resultado.size() >= maxPassagens) {
        break;
      }
      int custo = tokenCounter.estimarTokens(chunk.conteudo());
      boolean cabeNoOrcamento = resultado.isEmpty() || tokensUsados + custo <= orcamentoTokens;
      if (cabeNoOrcamento) {
        resultado.add(chunk.conteudo());
        tokensUsados += custo;
      }
    }
    return resultado;
  }

  private record ContextChunk(
      String id,
      String conteudo,
      Set<String> stems,
      boolean projeto,
      boolean preferencialFallback,
      Set<String> tagStems) {
  }

  private record ScoredChunk(ContextChunk chunk, double score) {
  }
}
