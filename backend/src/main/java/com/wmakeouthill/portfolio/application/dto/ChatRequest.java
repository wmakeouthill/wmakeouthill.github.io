package com.wmakeouthill.portfolio.application.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(@NotBlank String message) {
    public boolean temMensagemOculta() {
        return message != null && message.contains(";");
    }
}
