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
    long totalSizeBytes
) {
}


