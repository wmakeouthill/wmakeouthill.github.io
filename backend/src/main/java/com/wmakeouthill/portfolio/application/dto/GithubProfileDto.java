package com.wmakeouthill.portfolio.application.dto;

/**
 * Representa o perfil do usuário no GitHub.
 */
public record GithubProfileDto(
    long id,
    String login,
    String name,
    String avatarUrl,
    String htmlUrl,
    String bio,
    String company,
    String location,
    String email,
    String blog,
    String twitterUsername,
    int publicRepos,
    int publicGists,
    int followers,
    int following,
    String createdAt,
    String updatedAt
) {
}


