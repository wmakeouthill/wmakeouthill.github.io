package com.wmakeouthill.portfolio.application.port.out;

import com.wmakeouthill.portfolio.application.dto.ContactRequest;

public interface EmailPort {
    void enviarEmailContato(ContactRequest request);
}

