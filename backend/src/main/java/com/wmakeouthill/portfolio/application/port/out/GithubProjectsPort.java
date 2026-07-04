package com.wmakeouthill.portfolio.application.port.out;

import com.wmakeouthill.portfolio.application.dto.FileContentDto;
import com.wmakeouthill.portfolio.application.dto.GithubProfileDto;
import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.dto.LanguageShareDto;
import com.wmakeouthill.portfolio.application.dto.TreeNodeDto;

import java.util.List;
import java.util.Optional;

/**
 * Porta de saída para buscar dados do GitHub relacionados ao portfólio.
 */
public interface GithubProjectsPort {

  /**
   * Lista os repositórios públicos relevantes do usuário configurado.
   *
   * @return lista de repositórios ordenados (por padrão, mais recentes primeiro)
   */
  List<GithubRepositoryDto> listarRepositorios();

  /**
   * Busca o perfil do usuário no GitHub.
   *
   * @return perfil do usuário ou vazio se não encontrado
   */
  Optional<GithubProfileDto> buscarPerfil();

  /**
   * Busca as linguagens de um repositório específico.
   *
   * @param repoName nome do repositório
   * @return lista de linguagens com porcentagens
   */
  List<LanguageShareDto> buscarLinguagensRepositorio(String repoName);

  /**
   * Retorna o total de estrelas em todos os repositórios.
   *
   * @return total de estrelas
   */
  int contarTotalEstrelas();

  /**
   * Conta o total de repositórios com os quais o usuário autenticado contribui —
   * públicos e privados — incluindo os que possui, em que é colaborador e os de
   * organizações de que participa.
   *
   * @return número de repositórios contribuídos (público + privado)
   */
  int contarRepositoriosContribuidos();

  /**
   * Busca a árvore de arquivos de um repositório.
   *
   * @param repoName nome do repositório
   * @return lista de nós da árvore (arquivos e diretórios)
   */
  List<TreeNodeDto> buscarArvoreRepositorio(String repoName);

  /**
   * Busca o conteúdo de um arquivo específico do repositório.
   *
   * @param repoName nome do repositório
   * @param filePath caminho do arquivo dentro do repositório
   * @return conteúdo do arquivo ou vazio se não encontrado
   */
  Optional<FileContentDto> buscarConteudoArquivo(String repoName, String filePath);

  /**
   * Limpa todo o cache de projetos (repos, perfil, linguagens, árvores).
   * Próxima chamada vai ao GitHub (via ETag se disponível).
   */
  void clearCache();
}
