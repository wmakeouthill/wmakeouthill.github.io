package com.wmakeouthill.portfolio.application.dto;

/**
 * Representa a participação de uma linguagem em um repositório.
 */
public record LanguageShareDto(
    String name,
    int percentage,
    String color
) {
}


