package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.ChatRequest;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.usecase.ChatUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {
    private static final String HEADER_SESSION_ID = "X-Session-ID";
    
    private final ChatUseCase chatUseCase;

    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            HttpServletRequest httpRequest) {
        
        String sessionId = extrairSessionId(httpRequest);
        ChatResponse response = chatUseCase.execute(request, sessionId);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/clear")
    public ResponseEntity<Void> limparHistorico(HttpServletRequest httpRequest) {
        String sessionId = extrairSessionId(httpRequest);
        chatUseCase.limparHistorico(sessionId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Extrai o Session ID do header HTTP ou gera um novo se não existir.
     * 
     * @param httpRequest requisição HTTP
     * @return session ID
     */
    private String extrairSessionId(HttpServletRequest httpRequest) {
        String sessionId = httpRequest.getHeader(HEADER_SESSION_ID);
        if (sessionId == null || sessionId.isBlank()) {
            // Se não vier no header, gera um novo (fallback)
            sessionId = gerarSessionIdFallback();
        }
        return sessionId;
    }
    
    /**
     * Gera um Session ID temporário como fallback.
     * Em produção, o frontend sempre deve enviar o header.
     */
    private String gerarSessionIdFallback() {
        return "session-" + System.currentTimeMillis() + "-" + 
               Thread.currentThread().getId();
    }
}
