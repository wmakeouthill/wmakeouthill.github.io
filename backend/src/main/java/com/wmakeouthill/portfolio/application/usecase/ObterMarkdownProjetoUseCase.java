package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.domain.port.PortfolioContentPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ObterMarkdownProjetoUseCase {

  private final PortfolioContentPort portfolioContentPort;

  public Optional<String> executar(String nomeProjeto) {
    String normalizado = normalizarNomeProjeto(nomeProjeto);
    if (normalizado.isBlank()) {
      return Optional.empty();
    }
    return portfolioContentPort.carregarMarkdownPorProjeto(normalizado);
  }

  private String normalizarNomeProjeto(String nomeProjeto) {
    if (nomeProjeto == null) {
      return "";
    }
    return nomeProjeto.trim().toLowerCase();
  }
}


