package com.wmakeouthill.portfolio.application.dto;

import java.util.List;

/**
 * DTO para representar um nó na árvore de arquivos do repositório.
 */
public record TreeNodeDto(
        String path,
        String type, // "blob" para arquivo, "tree" para diretório
        String sha) {
    /**
     * Cria resposta com lista de nós.
     */
    public static RepoTreeResponse ofList(List<TreeNodeDto> nodes) {
        return new RepoTreeResponse(nodes);
    }
}
