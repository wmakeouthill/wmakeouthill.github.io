package com.wmakeouthill.portfolio.domain.model;

/**
 * Representa um markdown carregado do portfólio com metadados úteis
 * para seleção de contexto dinâmico da IA.
 *
 * @param nome    nome amigável (sem extensão)
 * @param caminho caminho completo dentro do classpath
 * @param conteudo conteúdo bruto do markdown
 * @param projeto indica se o markdown pertence à pasta de projetos
 */
public record PortfolioMarkdownResource(
    String nome,
    String caminho,
    String conteudo,
    boolean projeto
) {
}

