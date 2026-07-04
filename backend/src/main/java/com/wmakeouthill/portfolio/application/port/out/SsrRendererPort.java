package com.wmakeouthill.portfolio.application.port.out;

import com.wmakeouthill.portfolio.application.cache.ResultadoRenderizacao;

/**
 * Porta de saída para o renderer SSR (Node/Angular). Mantém o use case
 * desacoplado do transporte: hoje HTTP para o Express, amanhã poderia ser um
 * processo embarcado ou outro motor, sem mexer na orquestração de cache.
 */
public interface SsrRendererPort {

  /**
   * Renderiza a página pública do caminho informado.
   *
   * @param caminho path absoluto da rota pública (ex.: {@code /projects/aa-space}).
   * @param idioma  {@code pt} ou {@code en}, propagado como header de idioma.
   * @return HTML renderizado e status HTTP do renderer.
   */
  ResultadoRenderizacao renderizar(String caminho, String idioma);
}
