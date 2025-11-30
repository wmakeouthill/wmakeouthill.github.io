package com.wmakeouthill.portfolio.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
        String name,

        @NotBlank(message = "Email é obrigatório")
        @Email(message = "Email inválido")
        @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
        String email,

        @NotBlank(message = "Assunto é obrigatório")
        @Size(max = 200, message = "Assunto deve ter no máximo 200 caracteres")
        String subject,

        @NotBlank(message = "Mensagem é obrigatória")
        @Size(max = 5000, message = "Mensagem deve ter no máximo 5000 caracteres")
        String message
) {
}

