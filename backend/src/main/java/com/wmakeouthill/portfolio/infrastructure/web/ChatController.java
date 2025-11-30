package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.ChatRequest;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.usecase.ChatUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
@RequiredArgsConstructor
public class ChatController {
    private static final String HEADER_SESSION_ID = "X-Session-ID";
    
    private final ChatUseCase chatUseCase;

    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            HttpServletRequest httpRequest) {
        try {
            String sessionId = extrairSessionId(httpRequest);
            ChatResponse response = chatUseCase.execute(request, sessionId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log do erro para debug
            org.slf4j.LoggerFactory.getLogger(ChatController.class)
                .error("Erro ao processar mensagem de chat", e);
            // Retorna resposta de erro amigável
            return ResponseEntity
                    .status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ChatResponse("Erro ao processar mensagem. Tente novamente."));
        }
    }
    
    @PostMapping("/clear")
    public ResponseEntity<Void> limparHistorico(HttpServletRequest httpRequest) {
        try {
            String sessionId = extrairSessionId(httpRequest);
            chatUseCase.limparHistorico(sessionId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // Log do erro para debug
            org.slf4j.LoggerFactory.getLogger(ChatController.class)
                .error("Erro ao limpar histórico", e);
            // Retorna 200 mesmo em caso de erro para não quebrar o frontend
            return ResponseEntity.ok().build();
        }
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
