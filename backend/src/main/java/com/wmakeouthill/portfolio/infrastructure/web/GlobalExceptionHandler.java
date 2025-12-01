package com.wmakeouthill.portfolio.infrastructure.web;

import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.Map;

/**
 * Handler global de exceções para capturar e tratar erros não tratados.
 * Retorna respostas HTTP apropriadas e loga os erros para debug.
 */
@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Trata ClientAbortException - cliente fechou a conexão antes do servidor terminar.
     * Isso é comum quando o navegador cancela requisições (ex: pdfjs fazendo múltiplas requisições).
     * Não é um erro real, apenas logamos em nível DEBUG.
     */
    @ExceptionHandler(ClientAbortException.class)
    public void handleClientAbort(ClientAbortException ex) {
        log.debug("Cliente abortou a conexão: {}", ex.getMessage());
        // Não retorna nada pois a conexão já foi fechada pelo cliente
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        // Ignora ClientAbortException que pode vir encapsulada
        if (isClientAbortException(ex)) {
            log.debug("Cliente abortou a conexão (encapsulado): {}", ex.getMessage());
            return null;
        }
        
        log.error("Erro não tratado capturado pelo GlobalExceptionHandler", ex);
        
        String mensagem = "Erro interno do servidor";
        if (ex.getMessage() != null && !ex.getMessage().isBlank()) {
            mensagem = ex.getMessage();
        }
        
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", mensagem));
    }

    /**
     * Verifica se a exceção é ou contém um ClientAbortException.
     */
    private boolean isClientAbortException(Throwable ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof ClientAbortException) {
                return true;
            }
            String className = current.getClass().getName();
            if (className.contains("ClientAbort") || className.contains("Broken pipe")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Argumento inválido: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Argumento inválido"));
    }

    @ExceptionHandler(NullPointerException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Map<String, String>> handleNullPointer(NullPointerException ex) {
        log.error("NullPointerException capturada", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro interno: referência nula"));
    }
}

