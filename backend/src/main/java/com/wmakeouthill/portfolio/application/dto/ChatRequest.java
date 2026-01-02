package com.wmakeouthill.portfolio.application.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request para o chat com IA.
 * 
 * @param message mensagem do usuário
 * @param model   modelo de IA a usar: "gemini" (padrão) ou "gpt"
 */
public record ChatRequest(@NotBlank String message, String model) {

    public ChatRequest(@NotBlank String message) {
        this(message, "gemini"); // Gemini como padrão
    }

    public boolean temMensagemOculta() {
        return message != null && message.contains(";");
    }

    /**
     * Retorna o modelo a usar, com fallback para "gemini" se não especificado.
     */
    public String modeloEfetivo() {
        if (model == null || model.isBlank()) {
            return "gemini";
        }
        return model.toLowerCase();
    }

    public boolean isGpt() {
        return "gpt".equalsIgnoreCase(modeloEfetivo()) || "openai".equalsIgnoreCase(modeloEfetivo());
    }
}
