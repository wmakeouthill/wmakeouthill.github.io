package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.ContactRequest;
import com.wmakeouthill.portfolio.application.port.out.EmailPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EnviarEmailContatoUseCase {
    private final EmailPort emailPort;

    public void executar(ContactRequest request) {
        emailPort.enviarEmailContato(request);
    }
}

