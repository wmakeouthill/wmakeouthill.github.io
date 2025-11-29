package com.wmakeouthill.portfolio.application.dto;

public record ContactResponse(
        boolean success,
        String message
) {
    public static ContactResponse sucesso() {
        return new ContactResponse(true, "Mensagem enviada com sucesso!");
    }

    public static ContactResponse erro(String mensagem) {
        return new ContactResponse(false, mensagem);
    }
}

