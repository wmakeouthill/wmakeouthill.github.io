package com.wmakeouthill.portfolio.application.dto;

/**
 * DTO genérico para arquivos do repositório GitHub.
 * Usado para imagens, markdowns e outros arquivos de conteúdo.
 */
public record RepositoryFileDto(
    String fileName,
    String displayName,
    String path,
    String downloadUrl,
    String htmlUrl,
    long size,
    String sha,
    String type // "file" ou "dir"
) {
  /**
   * Retorna a extensão do arquivo em lowercase.
   */
  public String getExtension() {
    int lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0 && lastDot < fileName.length() - 1) {
      return fileName.substring(lastDot + 1).toLowerCase();
    }
    return "";
  }

  /**
   * Verifica se é uma imagem.
   */
  public boolean isImage() {
    String ext = getExtension();
    return ext.equals("png") || ext.equals("jpg") || ext.equals("jpeg") 
        || ext.equals("gif") || ext.equals("webp") || ext.equals("svg");
  }

  /**
   * Verifica se é um markdown.
   */
  public boolean isMarkdown() {
    return getExtension().equals("md");
  }
}

