package com.wmakeouthill.portfolio.application.dto;

/**
 * Requisição para gerar o currículo personalizado sob demanda
 * (POST /api/chat/curriculo). Desacoplada do fluxo de chat para evitar duas
 * chamadas pesadas ao Vertex na mesma requisição.
 *
 * @param message vaga / pedido do usuário (obrigatório)
 * @param reply   resposta conversacional já gerada pelo chat (opcional; usada
 *                como contexto extra — vazia no fluxo do comando /curriculo)
 */
public record ChatCurriculoRequest(String message, String reply) {
}
