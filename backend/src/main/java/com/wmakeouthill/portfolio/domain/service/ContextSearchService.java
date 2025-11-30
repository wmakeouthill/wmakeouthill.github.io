package com.wmakeouthill.portfolio.domain.service;

import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContextSearchService {

  private static final int MAX_FALLBACK = 2;
  private static final double MIN_SCORE = 0.4;

  private final PortfolioContentPort portfolioContentPort;

  private final List<ContextChunk> contextChunks = new ArrayList<>();
  private final List<ContextChunk> fallbackChunks = new ArrayList<>();

  @PostConstruct
  void carregarContextos() {
    List<PortfolioMarkdownResource> recursos = portfolioContentPort.carregarMarkdownsDetalhados();
    contextChunks.clear();
    int indice = 0;
    for (PortfolioMarkdownResource recurso : recursos) {
      contextChunks.add(new ContextChunk(
          recurso.nome() + "-" + indice++,
          recurso.conteudo(),
          extrairStems(recurso.conteudo()),
          recurso.projeto()
      ));
    }
    atualizarFallback();
  }

  public List<String> buscarContextos(String mensagem, int limite) {
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
    return total / tokens.size();
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
        .filter(chunk -> !chunk.projeto)
        .limit(MAX_FALLBACK)
        .forEach(fallbackChunks::add);
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
      boolean projeto
  ) {
  }

  private record ScoredChunk(ContextChunk chunk, double score) {
  }
}

