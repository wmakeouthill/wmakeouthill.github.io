package com.wmakeouthill.portfolio.application.port.out;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;

import java.util.List;
import java.util.Optional;

/**
 * Port para acesso ao conteúdo do portfólio armazenado no GitHub.
 * Inclui imagens de projetos, documentações e markdowns.
 */
public interface GithubRepositoryContentPort {

  // ─────────────────────────────────────────────────────────────────────────────
  // IMAGENS DE PROJETOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lista todas as imagens da pasta portifolio_imgs/
   */
  List<RepositoryFileDto> listarImagensProjetos();

  /**
   * Obtém os bytes de uma imagem específica.
   */
  Optional<byte[]> obterImagemBytes(String fileName);

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENTAÇÕES (Markdowns para IA)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lista todos os arquivos markdown da pasta portfolio-content/
   */
  List<RepositoryFileDto> listarDocumentacoes();

  /**
   * Lista os markdowns de projetos (portfolio-content/projects/)
   */
  List<RepositoryFileDto> listarDocumentacoesProjetos();

  /**
   * Lista os markdowns de trabalhos (portfolio-content/trabalhos/)
   */
  List<RepositoryFileDto> listarDocumentacoesTrabalhos();

  /**
   * Lista os markdowns de cases profissionais
   * (portfolio-content/cases/freelas e portfolio-content/cases/autou).
   * INDEX.md fica fora (é documento geral, não case).
   */
  List<RepositoryFileDto> listarDocumentacoesCases();

  /**
   * Obtém o conteúdo de um markdown específico.
   */
  Optional<String> obterMarkdownConteudo(String path);

  /**
   * Obtém todos os markdowns concatenados para alimentar a IA.
   */
  String obterTodosMarkdownsConcatenados();

  // ─────────────────────────────────────────────────────────────────────────────
  // GALERIA DE PROJETOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lista as mídias (imagens e vídeos) da galeria de um projeto específico.
   * Busca em portfolio-gallery/{projectName}/
   */
  List<RepositoryFileDto> listarGaleriaProjeto(String projectName);
}

