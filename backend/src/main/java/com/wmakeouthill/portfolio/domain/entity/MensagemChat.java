package com.wmakeouthill.portfolio.domain.entity;

import java.time.LocalDateTime;

/**
 * Entidade de domínio representando uma mensagem do chat.
 */
public record MensagemChat(
        String role,
        String content,
        LocalDateTime timestamp) {
    public static MensagemChat criarMensagemUsuario(String conteudo) {
        return new MensagemChat("user", conteudo, LocalDateTime.now());
    }

    public static MensagemChat criarMensagemAssistente(String conteudo) {
        return new MensagemChat("assistant", conteudo, LocalDateTime.now());
    }

    public static MensagemChat criarMensagemSistema(String conteudo) {
        return new MensagemChat("system", conteudo, LocalDateTime.now());
    }
}
