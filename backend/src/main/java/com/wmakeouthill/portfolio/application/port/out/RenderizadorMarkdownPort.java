package com.wmakeouthill.portfolio.application.port.out;

/**
 * Renderiza Markdown (READMEs de projetos) para HTML no backend, deixando o
 * conteúdo no source-code para os bots — em vez de renderizar no cliente.
 */
public interface RenderizadorMarkdownPort {

  /**
   * Converte Markdown em HTML. Diagramas Mermaid são embutidos como SVG quando
   * possível; se a renderização falhar, o bloco de código é mantido como texto
   * (indexável).
   *
   * @param markdown conteúdo bruto; {@code null}/vazio retorna string vazia.
   * @return HTML pronto para injeção.
   */
  String renderizarParaHtml(String markdown);
}
