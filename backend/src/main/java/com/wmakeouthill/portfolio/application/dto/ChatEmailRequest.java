package com.wmakeouthill.portfolio.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatEmailRequest(
        @NotBlank(message = "Mensagem é obrigatória")
        @Size(max = 5000, message = "Mensagem deve ter no máximo 5000 caracteres")
        String message,
        String model) {

    public String modeloEfetivo() {
        if (model == null || model.isBlank()) {
            return "gemini";
        }
        return model.toLowerCase();
    }
}
