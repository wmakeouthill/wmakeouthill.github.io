package com.wmakeouthill.portfolio.infrastructure.cache;

/**
 * Resposta de requisição condicional com ETag.
 * Permite verificar se dados mudaram sem baixar tudo novamente.
 *
 * @param <T> tipo do dado
 */
public record ConditionalResponse<T>(
        Status status,
        T data,
        String etag) {

    public enum Status {
        /** Dados não mudaram, usar cache */
        NOT_MODIFIED,
        /** Dados atualizados, usar nova resposta */
        OK,
        /** Erro na requisição */
        ERROR
    }

    /**
     * Cria resposta de dados não modificados.
     */
    public static <T> ConditionalResponse<T> notModified() {
        return new ConditionalResponse<>(Status.NOT_MODIFIED, null, null);
    }

    /**
     * Cria resposta com novos dados.
     */
    public static <T> ConditionalResponse<T> ok(T data, String etag) {
        return new ConditionalResponse<>(Status.OK, data, etag);
    }

    /**
     * Cria resposta de erro.
     */
    public static <T> ConditionalResponse<T> error() {
        return new ConditionalResponse<>(Status.ERROR, null, null);
    }

    public boolean isNotModified() {
        return status == Status.NOT_MODIFIED;
    }

    public boolean isOk() {
        return status == Status.OK;
    }

    public boolean isError() {
        return status == Status.ERROR;
    }
}
