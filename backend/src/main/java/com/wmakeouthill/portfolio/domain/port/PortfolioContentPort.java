package com.wmakeouthill.portfolio.domain.port;

import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;

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
   * Carrega markdowns com metadados para uso em buscas contextuais.
   *
   * @return lista de descritores de markdown
   */
  List<PortfolioMarkdownResource> carregarMarkdownsDetalhados();

  /**
   * Versão sensível a idioma de {@link #carregarMarkdownsDetalhados()}.
   * Implementações podem sobrescrever para carregar variantes traduzidas.
   * 
   * @param language código de idioma (ex.: "pt", "en")
   */
  default List<PortfolioMarkdownResource> carregarMarkdownsDetalhados(String language) {
    return carregarMarkdownsDetalhados();
  }

  /**
   * Carrega o markdown associado a um projeto específico, identificado por um
   * nome
   * já normalizado (ex.: "aa_space", "lol-matchmaking-fazenda").
   *
   * @param nomeProjetoNormalizado nome normalizado do projeto
   * @return markdown bruto, se existir
   */
  Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado);

  /**
   * Versão sensível a idioma de {@link #carregarMarkdownPorProjeto(String)}.
   * Implementações podem sobrescrever para carregar variantes traduzidas.
   * 
   * @param nomeProjetoNormalizado nome do projeto já normalizado (lowercase)
   * @param language               código de idioma (ex.: "pt", "en")
   */
  default Optional<String> carregarMarkdownPorProjeto(String nomeProjetoNormalizado, String language) {
    return carregarMarkdownPorProjeto(nomeProjetoNormalizado);
  }
}
