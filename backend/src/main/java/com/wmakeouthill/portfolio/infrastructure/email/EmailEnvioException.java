package com.wmakeouthill.portfolio.infrastructure.email;

/**
 * Exceção lançada quando ocorre erro ao enviar email.
 */
public class EmailEnvioException extends RuntimeException {

    public EmailEnvioException(String message, Throwable cause) {
        super(message, cause);
    }
}
