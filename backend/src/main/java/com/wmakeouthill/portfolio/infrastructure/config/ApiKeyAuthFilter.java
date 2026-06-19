package com.wmakeouthill.portfolio.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Filtro de autenticação via header X-API-Key.
 * 
 * Toda requisição para /api/** deve incluir o header:
 * X-API-Key: <valor configurado em API_KEY>
 * 
 * Exceções (não exigem API Key):
 * - /api/health (health check)
 * - Requisições OPTIONS (CORS preflight)
 * - Requisições internas (loopback: SSR Node → Spring, Caddy → localhost:8080)
 * - Requisições via domínio público (front + API na mesma origem Oracle)
 * - API_KEY não configurada (modo desenvolvimento)
 * 
 * Configuração:
 * - Variável de ambiente API_KEY ou propriedade api.key
 * - Se API_KEY não estiver configurada, o filtro é DESATIVADO (modo dev)
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10) // Roda depois do CORS filter
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-API-Key";

    // Paths que NÃO exigem API Key
    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/api/health");

    /** Hosts do site servido pelo Oracle (browser same-origin via Caddy). */
    private static final Set<String> TRUSTED_PUBLIC_HOSTS = Set.of(
            "wmakeouthill.dev",
            "www.wmakeouthill.dev",
            "localhost",
            "127.0.0.1");

    private final String apiKey;
    private final boolean filterEnabled;

    public ApiKeyAuthFilter(@Value("${api.key:}") String apiKey) {
        if (apiKey != null && !apiKey.isBlank()) {
            this.apiKey = apiKey;
            this.filterEnabled = true;
            log.info("🔐 ApiKeyAuthFilter ATIVADO — todas as requisições /api/** exigem header X-API-Key");
        } else {
            this.apiKey = null;
            this.filterEnabled = false;
            log.warn("⚠️ ApiKeyAuthFilter DESATIVADO — API_KEY não configurada (modo desenvolvimento)");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();

        // Não filtra se não é rota de API
        if (!path.startsWith("/api/")) {
            return true;
        }

        // Não filtra paths públicos
        if (PUBLIC_PATHS.contains(path)) {
            return true;
        }

        // Não filtra requisições OPTIONS (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Não filtra se o filtro está desativado (API_KEY não configurada)
        if (!filterEnabled) {
            return true;
        }

        // Loopback (SSR Node, Caddy reverse_proxy → 127.0.0.1:8080)
        if (isLoopbackRequest(request)) {
            return true;
        }

        // Browser same-origin: front e API servidos pelo mesmo domínio (Caddy → Spring)
        if (isTrustedPublicHost(request)) {
            return true;
        }

        return false;
    }

    private boolean isLoopbackRequest(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        return "127.0.0.1".equals(remote) || "0:0:0:0:0:0:0:1".equals(remote);
    }

    private boolean isTrustedPublicHost(HttpServletRequest request) {
        String hostHeader = request.getHeader("Host");
        if (hostHeader == null || hostHeader.isBlank()) {
            return false;
        }
        String hostname = hostHeader.split(":")[0].trim().toLowerCase();
        return TRUSTED_PUBLIC_HOSTS.contains(hostname);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String requestApiKey = request.getHeader(API_KEY_HEADER);

        if (requestApiKey == null || requestApiKey.isBlank()) {
            log.warn("🚫 Requisição sem API Key: {} {} de {}",
                    request.getMethod(), request.getRequestURI(), request.getRemoteAddr());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Header X-API-Key é obrigatório\"}");
            return;
        }

        if (!apiKey.equals(requestApiKey)) {
            log.warn("🚫 API Key inválida: {} {} de {}",
                    request.getMethod(), request.getRequestURI(), request.getRemoteAddr());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"API Key inválida\"}");
            return;
        }

        // API Key válida — continua a cadeia de filtros
        filterChain.doFilter(request, response);
    }
}
