package com.wmakeouthill.portfolio.domain.service;

import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
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

  private static final int MAX_FALLBACK = 2;
  private static final double MIN_SCORE = 0.4;

  private static final long CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

  private final PortfolioContentPort portfolioContentPort;

  private final List<ContextChunk> contextChunks = new ArrayList<>();
  private final List<ContextChunk> fallbackChunks = new ArrayList<>();
  private volatile long ultimoCarregamento = 0;

  @PostConstruct
  void carregarContextos() {
    recarregarContextos();
  }

  /**
   * Recarrega os contextos do repositório GitHub.
   * Chamado automaticamente se o cache expirou.
   */
  public synchronized void recarregarContextos() {
    log.info("Recarregando contextos do repositório GitHub...");
    List<PortfolioMarkdownResource> recursos = portfolioContentPort.carregarMarkdownsDetalhados();
    contextChunks.clear();
    int indice = 0;
    for (PortfolioMarkdownResource recurso : recursos) {
      contextChunks.add(new ContextChunk(
          recurso.nome() + "-" + indice++,
          recurso.conteudo(),
          extrairStems(recurso.conteudo()),
          recurso.projeto(),
          recurso.preferencialFallback(),
          normalizarTags(recurso.tags())
      ));
    }
    atualizarFallback();
    ultimoCarregamento = System.currentTimeMillis();
    log.info("Contextos recarregados: {} chunks disponíveis", contextChunks.size());
  }

  /**
   * Verifica se o cache expirou e recarrega se necessário.
   */
  private void verificarCacheExpirado() {
    if (System.currentTimeMillis() - ultimoCarregamento > CACHE_TTL_MS) {
      log.debug("Cache de contextos expirado, recarregando...");
      recarregarContextos();
    }
  }

  public List<String> buscarContextos(String mensagem, int limite) {
    // Verifica se precisa recarregar contextos (cache de 5 min)
    verificarCacheExpirado();
    
    List<String> tokens = tokenizar(mensagem);
    if (tokens.isEmpty()) {
      return limitar(obterFallback(), limite);
    }
    List<ContextChunk> ranqueados = ranquear(tokens);
    if (ranqueados.isEmpty()) {
      return limitar(obterFallback(), limite);
    }
    return ranqueados.stream()
        .limit(limite)
        .map(ContextChunk::conteudo)
        .toList();
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
    return new ArrayList<>(extrairStems(mensagem));
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

  private String normalize(String palavra) {
    String semAcento = Normalizer.normalize(palavra, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "");
    return semAcento.toLowerCase(Locale.ROOT);
  }

  private List<String> obterFallback() {
    if (!fallbackChunks.isEmpty()) {
      return fallbackChunks.stream()
          .map(ContextChunk::conteudo)
          .toList();
    }
    return contextChunks.stream()
        .limit(MAX_FALLBACK)
        .map(ContextChunk::conteudo)
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

  private List<String> limitar(List<String> contextos, int limite) {
    return contextos.stream()
        .limit(limite)
        .toList();
  }

  private record ContextChunk(
      String id,
      String conteudo,
      Set<String> stems,
      boolean projeto,
      boolean preferencialFallback,
      Set<String> tagStems
  ) {
  }

  private record ScoredChunk(ContextChunk chunk, double score) {
  }
}

