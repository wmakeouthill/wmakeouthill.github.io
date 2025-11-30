package com.wmakeouthill.portfolio.domain.port;

import java.util.List;
import java.util.Optional;

/**
 * Porta de domínio para carregar conteúdos do portfólio
 * (como markdowns de projetos) a partir de uma fonte qualquer.
 *
 * Implementações concretas devem ficar na camada de infraestrutura.
 */
public interface PortfolioContentPort {

  /**
   * Carrega o conteúdo em texto de arquivos markdown relevantes do portfólio
   * para enriquecer o contexto da IA.
   *
   * @return lista de conteúdos em texto; nunca {@code null}
   */
  List<String> carregarConteudosMarkdown();

  /**
   * Carrega o markdown associado a um projeto específico, identificado por um nome
   * já normalizado (ex.: "aa_space", "lol-matchmaking-fazenda").
   *
   * @param nomeProjetoNormalizado nome normalizado do projeto
   * @return markdown bruto, se existir
   */
  Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado);
}



