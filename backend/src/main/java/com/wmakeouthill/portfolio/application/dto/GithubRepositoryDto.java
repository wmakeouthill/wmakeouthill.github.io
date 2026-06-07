package com.wmakeouthill.portfolio.application.dto;

import java.util.List;

/**
 * Representa um repositório do GitHub exposto pelo backend.
 */
public record GithubRepositoryDto(
    long id,
    String name,
    String fullName,
    String description,
    String htmlUrl,
    String homepage,
    int stargazersCount,
    int forksCount,
    String language,
    List<String> topics,
    String createdAt,
    String updatedAt,
    String pushedAt,
    boolean fork,
    List<LanguageShareDto> languages,
    long totalSizeBytes,
    boolean hasReadme
) {

  /**
   * Retorna uma cópia deste DTO com {@code hasReadme} ajustado. Evita repetir os
   * 16 campos em cada ponto que só precisa marcar a disponibilidade de README.
   */
  public GithubRepositoryDto withHasReadme(boolean value) {
    return new GithubRepositoryDto(id, name, fullName, description, htmlUrl, homepage,
        stargazersCount, forksCount, language, topics, createdAt, updatedAt, pushedAt,
        fork, languages, totalSizeBytes, value);
  }
}


