package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.ChatEmailRequest;
import com.wmakeouthill.portfolio.application.dto.ChatEmailResponse;
import com.wmakeouthill.portfolio.application.dto.ContactRequest;
import com.wmakeouthill.portfolio.application.dto.EmailRewrite;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EnviarEmailChatUseCase {
    private static final String CHAT_EMAIL = "chat@wmakeouthill.dev";

    private final ReescreverMensagemUseCase reescreverMensagemUseCase;
    private final EnviarEmailContatoUseCase enviarEmailContatoUseCase;

    public ChatEmailResponse executar(ChatEmailRequest request) {
        String mensagem = normalizarMensagem(request.message());
        EmailRewrite email = reescreverMensagemUseCase.executar(mensagem, request.modeloEfetivo());
        ContactRequest contactRequest = new ContactRequest(
                "Chat IA",
                CHAT_EMAIL,
                email.subject(),
                email.body());
        enviarEmailContatoUseCase.executar(contactRequest);
        return ChatEmailResponse.sucesso(email.subject(), email.body());
    }

    private String normalizarMensagem(String mensagem) {
        String texto = mensagem == null ? "" : mensagem.trim();
        if (texto.toLowerCase().startsWith("/email")) {
            return texto.substring("/email".length()).trim();
        }
        return texto;
    }
}
