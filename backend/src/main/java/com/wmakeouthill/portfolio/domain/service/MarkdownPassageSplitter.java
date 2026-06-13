package com.wmakeouthill.portfolio.domain.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Divide um markdown em "passagens" (trechos) para recuperação contextual (RAG).
 *
 * <p>
 * Antes, cada arquivo markdown era indexado inteiro como um único "chunk": uma
 * pergunta que casasse com uma palavra puxava o documento completo (vários
 * milhares de tokens). Aqui o documento é fatiado em passagens menores por
 * cabeçalho e parágrafo, de modo que a busca recupere apenas os trechos
 * relevantes, mantendo o contexto enxuto.
 * </p>
 *
 * <p>
 * Estratégia: separa por cabeçalhos markdown ({@code #}..{@code ######}); cada
 * seção vira uma passagem. Seções acima do alvo são reempacotadas por parágrafo
 * (linha em branco), preservando o cabeçalho da seção como contexto em cada
 * subpassagem. Parágrafos isolados gigantes são quebrados por tamanho.
 * </p>
 */
@Service
public class MarkdownPassageSplitter {

  /** Alvo máximo de caracteres por passagem (~4 chars/token → ~700 tokens). */
  private static final int MAX_CHARS = 2800;

  private static final Pattern LINHA_HEADING = Pattern.compile("^#{1,6}\\s.*");

  /**
   * Fatiar o markdown em passagens não-vazias, cada uma com no máximo
   * aproximadamente {@link #MAX_CHARS} caracteres.
   *
   * @param markdown conteúdo bruto; {@code null}/vazio retorna lista vazia
   * @return passagens na ordem original do documento
   */
  public List<String> dividir(String markdown) {
    if (markdown == null || markdown.isBlank()) {
      return List.of();
    }

    List<String> passagens = new ArrayList<>();
    for (String secao : separarPorCabecalho(markdown.strip())) {
      if (secao.length() <= MAX_CHARS) {
        passagens.add(secao);
      } else {
        passagens.addAll(empacotarParagrafos(secao));
      }
    }
    return passagens;
  }

  /**
   * Separa o texto em seções: uma nova seção começa a cada linha de cabeçalho
   * markdown. O conteúdo antes do primeiro cabeçalho forma sua própria seção.
   */
  private List<String> separarPorCabecalho(String texto) {
    List<String> secoes = new ArrayList<>();
    StringBuilder atual = new StringBuilder();

    for (String linha : texto.split("\n", -1)) {
      boolean ehCabecalho = LINHA_HEADING.matcher(linha).matches();
      if (ehCabecalho && !atual.isEmpty()) {
        adicionarSeNaoVazio(secoes, atual.toString());
        atual.setLength(0);
      }
      atual.append(linha).append('\n');
    }
    adicionarSeNaoVazio(secoes, atual.toString());
    return secoes;
  }

  /**
   * Reempacota uma seção grande em subpassagens por parágrafo, mantendo o
   * cabeçalho da seção (se houver) como prefixo de cada subpassagem.
   */
  private List<String> empacotarParagrafos(String secao) {
    String cabecalho = extrairCabecalho(secao);
    String prefixo = cabecalho.isEmpty() ? "" : cabecalho + "\n\n";

    List<String> subpassagens = new ArrayList<>();
    StringBuilder bloco = new StringBuilder();

    for (String paragrafo : secao.split("\n\\s*\n")) {
      String p = paragrafo.strip();
      if (p.isEmpty() || p.equals(cabecalho)) {
        continue;
      }
      if (p.length() > MAX_CHARS) {
        descarregarBloco(subpassagens, prefixo, bloco);
        for (String fatia : quebrarPorTamanho(p)) {
          subpassagens.add(prefixo + fatia);
        }
        continue;
      }
      if (bloco.length() + p.length() > MAX_CHARS && bloco.length() > 0) {
        descarregarBloco(subpassagens, prefixo, bloco);
      }
      if (bloco.length() > 0) {
        bloco.append("\n\n");
      }
      bloco.append(p);
    }
    descarregarBloco(subpassagens, prefixo, bloco);
    return subpassagens;
  }

  private void descarregarBloco(List<String> destino, String prefixo, StringBuilder bloco) {
    if (bloco.length() > 0) {
      destino.add(prefixo + bloco.toString().strip());
      bloco.setLength(0);
    }
  }

  private String extrairCabecalho(String secao) {
    String primeiraLinha = secao.lines().findFirst().orElse("");
    return LINHA_HEADING.matcher(primeiraLinha).matches() ? primeiraLinha.strip() : "";
  }

  /** Quebra um parágrafo muito grande em fatias de até {@link #MAX_CHARS}. */
  private List<String> quebrarPorTamanho(String texto) {
    List<String> fatias = new ArrayList<>();
    for (int inicio = 0; inicio < texto.length(); inicio += MAX_CHARS) {
      int fim = Math.min(inicio + MAX_CHARS, texto.length());
      String fatia = texto.substring(inicio, fim).strip();
      if (!fatia.isEmpty()) {
        fatias.add(fatia);
      }
    }
    return fatias;
  }

  private void adicionarSeNaoVazio(List<String> destino, String texto) {
    String limpo = texto.strip();
    if (!limpo.isEmpty()) {
      destino.add(limpo);
    }
  }
}
