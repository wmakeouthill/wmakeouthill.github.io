package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.ChatEmailRequest;
import com.wmakeouthill.portfolio.application.dto.ChatEmailResponse;
import com.wmakeouthill.portfolio.application.dto.ChatRequest;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.dto.ChatTtsRequest;
import com.wmakeouthill.portfolio.application.dto.MediaPart;
import com.wmakeouthill.portfolio.application.usecase.ChatUseCase;
import com.wmakeouthill.portfolio.application.usecase.EnviarEmailChatUseCase;
import com.wmakeouthill.portfolio.infrastructure.ai.GeminiTtsAdapter;
import com.wmakeouthill.portfolio.infrastructure.document.DocumentTextExtractor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.OPTIONS })
// Limites de upload multipart configurados em application.properties
// (spring.servlet.multipart.max-file-size / max-request-size)
@RequiredArgsConstructor
public class ChatController {
    private static final String HEADER_SESSION_ID = "X-Session-ID";

    private final ChatUseCase chatUseCase;
    private final EnviarEmailChatUseCase enviarEmailChatUseCase;
    private final DocumentTextExtractor documentTextExtractor;
    private final GeminiTtsAdapter geminiTtsAdapter;

    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            HttpServletRequest httpRequest) {
        try {
            String sessionId = extrairSessionId(httpRequest);
            String language = extrairIdioma(httpRequest);
            ChatResponse response = chatUseCase.execute(request, sessionId, language);
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

    @PostMapping("/email")
    public ResponseEntity<ChatEmailResponse> email(@Valid @RequestBody ChatEmailRequest request) {
        try {
            return ResponseEntity.ok(enviarEmailChatUseCase.executar(request));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ChatController.class)
                    .error("Erro ao enviar email pelo chat", e);
            return ResponseEntity.internalServerError()
                    .body(ChatEmailResponse.erro("Não foi possível enviar o email agora."));
        }
    }

    @PostMapping("/tts")
    public ResponseEntity<ChatResponse> tts(@RequestBody ChatTtsRequest request) {
        String texto = request == null || request.text() == null ? "" : request.text().trim();
        if (texto.isBlank()) {
            return ResponseEntity.badRequest().body(new ChatResponse("Texto obrigatório para gerar áudio."));
        }

        return geminiTtsAdapter.sintetizarWavBase64(texto)
                .map(audio -> ResponseEntity.ok(new ChatResponse("", null, audio, null, null)))
                .orElseGet(() -> ResponseEntity
                        .status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)
                        .body(new ChatResponse("Não foi possível gerar áudio agora.")));
    }

    private static final int MAX_ARQUIVOS = 5;
    private static final long MAX_TAMANHO_BYTES = 20L * 1024 * 1024; // 20MB por arquivo

    @PostMapping(value = "/multimodal", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatResponse> chatMultimodal(
            @RequestParam(value = "message", required = false) String message,
            @RequestParam(value = "model", required = false) String model,
            @RequestParam(value = "audioResponse", required = false, defaultValue = "false") boolean audioResponse,
            @RequestParam(value = "files", required = false) MultipartFile[] files,
            HttpServletRequest httpRequest) {
        try {
            List<MediaPart> media = new ArrayList<>();
            StringBuilder textoDocumentos = new StringBuilder();
            if (files != null) {
                if (files.length > MAX_ARQUIVOS) {
                    return ResponseEntity.badRequest()
                            .body(new ChatResponse("Máximo de " + MAX_ARQUIVOS + " arquivos por mensagem."));
                }
                for (MultipartFile file : files) {
                    if (file == null || file.isEmpty()) {
                        continue;
                    }
                    if (file.getSize() > MAX_TAMANHO_BYTES) {
                        return ResponseEntity.badRequest().body(new ChatResponse(
                                "O arquivo '" + file.getOriginalFilename() + "' excede o limite de 20MB."));
                    }
                    if (isVideo(file.getContentType())) {
                        return ResponseEntity.badRequest()
                                .body(new ChatResponse("Envio de vídeo não é suportado no chat."));
                    }
                    String filename = file.getOriginalFilename();

                    // Documentos Office (Word/Excel/PowerPoint) não são lidos
                    // nativamente pelo Gemini: extraímos o texto e anexamos como contexto.
                    if (documentTextExtractor.isDocumentoOffice(filename)) {
                        String texto = documentTextExtractor.extrair(file.getBytes(), filename);
                        if (!texto.isBlank()) {
                            textoDocumentos.append("\n\n[Documento anexado: ").append(filename).append("]\n")
                                    .append(texto);
                        } else {
                            textoDocumentos.append("\n\n[Documento anexado: ").append(filename)
                                    .append(" — não foi possível extrair o texto]");
                        }
                        continue;
                    }

                    String base64 = Base64.getEncoder().encodeToString(file.getBytes());
                    media.add(new MediaPart(file.getContentType(), base64, file.getOriginalFilename()));
                }
            }

            String sessionId = extrairSessionId(httpRequest);
            String language = extrairIdioma(httpRequest);
            String mensagemFinal = (message == null ? "" : message);
            if (textoDocumentos.length() > 0) {
                mensagemFinal += textoDocumentos;
            }
            ChatRequest request = new ChatRequest(mensagemFinal,
                    model == null || model.isBlank() ? "gemini" : model);
            ChatResponse response = chatUseCase.executeMultimodal(request, media, sessionId, language, audioResponse);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ChatController.class)
                    .error("Erro ao processar mensagem multimodal", e);
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

    private boolean isVideo(String contentType) {
        return contentType != null && contentType.startsWith("video/");
    }

    /**
     * Extrai idioma da requisição via header Accept-Language / X-Language.
     */
    private String extrairIdioma(HttpServletRequest request) {
        String lang = request.getHeader("X-Language");
        if (lang == null || lang.isBlank()) {
            lang = request.getHeader("Accept-Language");
        }
        if (lang == null) {
            return "pt";
        }
        String lower = lang.toLowerCase();
        return lower.startsWith("en") ? "en" : "pt";
    }
}
