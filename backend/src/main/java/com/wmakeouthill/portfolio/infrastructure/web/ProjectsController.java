package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.GithubRepositoryDto;
import com.wmakeouthill.portfolio.application.usecase.ListarProjetosGithubUseCase;
import com.wmakeouthill.portfolio.application.usecase.ObterMarkdownProjetoUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectsController {

  private final ListarProjetosGithubUseCase listarProjetosGithubUseCase;
  private final ObterMarkdownProjetoUseCase obterMarkdownProjetoUseCase;

  @GetMapping
  public ResponseEntity<List<GithubRepositoryDto>> listarProjetos() {
    List<GithubRepositoryDto> repositorios = listarProjetosGithubUseCase.executar();
    return ResponseEntity.ok(repositorios);
  }

  @GetMapping("/{projectName}/markdown")
  public ResponseEntity<String> obterMarkdown(@PathVariable String projectName) {
    return obterMarkdownProjetoUseCase.executar(projectName)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}


