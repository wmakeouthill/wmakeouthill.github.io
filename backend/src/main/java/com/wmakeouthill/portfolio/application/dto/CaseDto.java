package com.wmakeouthill.portfolio.application.dto;

import java.util.List;

/**
 * Card de case profissional exibido na aba Profissionais.
 * Serializado como JSON em GET /api/content/cases.
 */
public record CaseDto(
    String slug,
    String title,
    String client,
    String category,
    String status,
    List<String> stack,
    String coverUrl,
    String logoUrl,
    boolean hasGallery,
    String gallerySlug,
    Integer order) {
}
