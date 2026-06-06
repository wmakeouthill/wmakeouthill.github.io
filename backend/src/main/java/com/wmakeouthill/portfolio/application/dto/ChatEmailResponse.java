package com.wmakeouthill.portfolio.application.dto;

public record ChatEmailResponse(
        boolean success,
        String reply,
        String subject,
        String body) {

    public static ChatEmailResponse sucesso(String subject, String body) {
        return new ChatEmailResponse(true, "Email enviado para o Wesley.", subject, body);
    }

    public static ChatEmailResponse erro(String mensagem) {
        return new ChatEmailResponse(false, mensagem, null, null);
    }
}
