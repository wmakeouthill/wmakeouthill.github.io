package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.dto.EmailRewrite;
import com.wmakeouthill.portfolio.infrastructure.ai.AIChatRouter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReescreverMensagemUseCase {
    private final AIChatRouter aiChatRouter;

    public EmailRewrite executar(String mensagem, String modelo) {
        String texto = mensagem == null ? "" : mensagem.trim();
        if (texto.isBlank()) {
            return new EmailRewrite("Contato pelo chat do portfólio", "");
        }

        ChatResponse resposta = aiChatRouter.chat(systemPrompt(), List.of(), texto, modelo);
        return parseResposta(resposta.reply(), texto);
    }

    private String systemPrompt() {
        return """
                Você redige emails para contato profissional com o Wesley.
                Melhore apenas forma, clareza e organização.
                Não invente fatos, não adicione promessas, não remova dados importantes e preserve a intenção original.
                Responda exatamente neste formato:
                ASSUNTO: assunto curto
                CORPO:
                corpo do email
                """;
    }

    private EmailRewrite parseResposta(String resposta, String fallbackBody) {
        if (resposta == null || resposta.isBlank()) {
            return fallback(fallbackBody);
        }

        String subject = extrairEntreMarcadores(resposta, "ASSUNTO:", "CORPO:");
        String body = extrairAposMarcador(resposta, "CORPO:");
        if (subject.isBlank() || body.isBlank()) {
            return fallback(fallbackBody);
        }

        return new EmailRewrite(limitar(subject.trim(), 200), body.trim());
    }

    private EmailRewrite fallback(String body) {
        return new EmailRewrite("Contato pelo chat do portfólio", body);
    }

    private String extrairEntreMarcadores(String texto, String inicio, String fim) {
        int start = texto.indexOf(inicio);
        int end = texto.indexOf(fim);
        if (start < 0 || end <= start) {
            return "";
        }
        return texto.substring(start + inicio.length(), end);
    }

    private String extrairAposMarcador(String texto, String marcador) {
        int start = texto.indexOf(marcador);
        if (start < 0) {
            return "";
        }
        return texto.substring(start + marcador.length());
    }

    private String limitar(String texto, int limite) {
        if (texto.length() <= limite) {
            return texto;
        }
        return texto.substring(0, limite).trim();
    }
}
