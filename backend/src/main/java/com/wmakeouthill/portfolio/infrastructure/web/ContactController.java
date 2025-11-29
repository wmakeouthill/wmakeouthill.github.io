package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.ContactRequest;
import com.wmakeouthill.portfolio.application.dto.ContactResponse;
import com.wmakeouthill.portfolio.application.usecase.EnviarEmailContatoUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
public class ContactController {
    private final EnviarEmailContatoUseCase enviarEmailContatoUseCase;

    @PostMapping
    public ResponseEntity<ContactResponse> enviarContato(@Valid @RequestBody ContactRequest request) {
        try {
            enviarEmailContatoUseCase.executar(request);
            return ResponseEntity.ok(ContactResponse.sucesso());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ContactResponse.erro("Erro ao enviar mensagem. Tente novamente mais tarde."));
        }
    }
}

