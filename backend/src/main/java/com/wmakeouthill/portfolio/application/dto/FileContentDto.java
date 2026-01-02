package com.wmakeouthill.portfolio.application.dto;

/**
 * DTO para representar o conteúdo de um arquivo do repositório.
 */
public record FileContentDto(
        String name,
        String path,
        String content) {
}
