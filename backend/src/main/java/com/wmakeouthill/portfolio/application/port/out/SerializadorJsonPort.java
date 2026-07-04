package com.wmakeouthill.portfolio.application.port.out;

/**
 * Serializa estruturas (mapas/objetos) para JSON — usado para montar blocos
 * JSON-LD de SEO. A lógica de estrutura fica na aplicação; a serialização, na
 * infraestrutura.
 */
public interface SerializadorJsonPort {

  String serializar(Object valor);
}
