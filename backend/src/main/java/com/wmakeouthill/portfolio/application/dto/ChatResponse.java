package com.wmakeouthill.portfolio.application.dto;

/**
 * Resposta do chat com informações sobre qual modelo de IA respondeu.
 * 
 * @param reply  Texto da resposta
 * @param modelo Modelo de IA que gerou a resposta (ex: "gemini-2.5-flash",
 *               "gpt-4o-mini")
 */
public record ChatResponse(String reply, String modelo) {

    /**
     * Construtor de compatibilidade para respostas sem modelo especificado.
     */
    public ChatResponse(String reply) {
        this(reply, null);
    }
}
