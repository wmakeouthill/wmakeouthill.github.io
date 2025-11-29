package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.port.out.GithubProjectsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ListarProjetosGithubUseCase {

  private final GithubProjectsPort githubProjectsPort;

  public List<GithubRepositoryDto> executar() {
    List<GithubRepositoryDto> repositorios = githubProjectsPort.listarRepositorios();

    return repositorios.stream()
        .sorted(Comparator
            .comparing(this::calcularTamanhoCodigo)
            .thenComparing((GithubRepositoryDto repo) -> repo.stargazersCount() + repo.forksCount())
            .thenComparing(GithubRepositoryDto::pushedAt)
            .reversed())
        .toList();
  }

  /**
   * Retorna o tamanho total do código em bytes.
   * Quanto maior o tamanho, mais código o projeto tem.
   */
  private long calcularTamanhoCodigo(GithubRepositoryDto repo) {
    return repo.totalSizeBytes();
  }
}
