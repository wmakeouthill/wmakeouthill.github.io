package com.wmakeouthill.portfolio.infrastructure.markdown;

import java.util.List;

/**
 * Metadados extraídos do frontmatter YAML de um case profissional, mais o
 * corpo do markdown já sem o bloco YAML. Campos ausentes ficam null
 * (stack = lista vazia); quem consome decide o fallback.
 */
public record CaseFrontmatter(
    String title,
    String client,
    String category,
    String status,
    List<String> stack,
    String logo,
    String cover,
    Integer order,
    String gallery,
    String corpo) {

  public static CaseFrontmatter vazio(String corpo) {
    return new CaseFrontmatter(null, null, null, null, List.of(), null, null, null, null, corpo);
  }
}
