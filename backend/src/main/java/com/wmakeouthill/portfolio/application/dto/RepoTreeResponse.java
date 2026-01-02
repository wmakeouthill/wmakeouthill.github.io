package com.wmakeouthill.portfolio.application.dto;

import java.util.List;

/**
 * Resposta contendo a árvore de arquivos do repositório.
 */
public record RepoTreeResponse(
        List<TreeNodeDto> tree) {
}
