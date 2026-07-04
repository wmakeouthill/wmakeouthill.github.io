package com.wmakeouthill.portfolio.infrastructure.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.port.out.AIChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
import com.wmakeouthill.portfolio.infrastructure.utils.TokenCounter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Adapter para integração com o Gemini através do Vertex AI.
 * 
 * <p>
 * Gemini é significativamente mais rápido que GPT-4, mantendo boa qualidade.
 * Este adapter é sempre carregado e pode ser usado pelo AIChatRouter
 * para rotear requisições dinamicamente entre Gemini e OpenAI.
 * </p>
 * 
 * <p>
 * A autenticação usa Application Default Credentials. Em produção, forneça o
 * JSON da service account via `GOOGLE_APPLICATION_CREDENTIALS`.
 * </p>
 * 
 * <p>
 * Exemplo de configuração:
 * 
 * <pre>
 * vertex.ai.project-id=${VERTEX_AI_PROJECT_ID:}
 * vertex.ai.location=${VERTEX_AI_LOCATION:global}
 * gemini.model=gemini-3.1-flash-lite
 * gemini.models.fallback=gemini-2.5-flash
 * </pre>
 * </p>
 */
@Component
@Primary
public class GeminiAdapter implements AIChatPort {
    private static final Logger log = LoggerFactory.getLogger(GeminiAdapter.class);
    private static final String MODELO_PADRAO = "gemini-3.1-flash-lite";
    private static final int MAX_TOKENS_PADRAO = 4000;

    private final ObjectMapper mapper = new ObjectMapper();
    private final TokenCounter tokenCounter = TokenCounter.getInstance();
    private final VertexAiClient vertexAiClient;
    private final List<String> modelosFallback;
    private final int maxTokens;
    private final String thinkingLevel;

    public GeminiAdapter(
            VertexAiClient vertexAiClient,
            @Value("${gemini.model:" + MODELO_PADRAO + "}") String modelo,
            @Value("${gemini.models.fallback:}") String modelosFallbackStr,
            @Value("${gemini.max-tokens:" + MAX_TOKENS_PADRAO + "}") int maxTokens,
            @Value("${gemini.thinking-level:low}") String thinkingLevel) {
        this.maxTokens = maxTokens;
        this.thinkingLevel = thinkingLevel == null || thinkingLevel.isBlank() ? "low" : thinkingLevel.trim();
        this.vertexAiClient = vertexAiClient;

        // Constrói lista de modelos: modelo principal + fallbacks
        List<String> modelos = new ArrayList<>();
        modelos.add(modelo);

        if (modelosFallbackStr != null && !modelosFallbackStr.isBlank()) {
            List<String> fallbacks = Arrays.stream(modelosFallbackStr.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.toList());
            modelos.addAll(fallbacks);
        }

        this.modelosFallback = modelos;
        log.info("Gemini Adapter configurado com {} modelo(s): {}, max_tokens: {}",
                this.modelosFallback.size(), this.modelosFallback, this.maxTokens);
    }

    @Override
    public ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual) {
        return chatInterno(systemPrompt, historico, mensagemAtual, java.util.Collections.emptyList());
    }

    @Override
    public ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual,
            List<com.wmakeouthill.portfolio.application.dto.MediaPart> media) {
        return chatInterno(systemPrompt, historico, mensagemAtual,
                media == null ? java.util.Collections.emptyList() : media);
    }

    private ChatResponse chatInterno(String systemPrompt, List<MensagemChat> historico, String mensagemAtual,
            List<com.wmakeouthill.portfolio.application.dto.MediaPart> media) {
        return chatInterno(systemPrompt, historico, mensagemAtual, media, 0.9);
    }

    public ChatResponse chatComTemperatura(String systemPrompt, List<MensagemChat> historico, String mensagemAtual,
            double temperature) {
        return chatInterno(systemPrompt, historico, mensagemAtual, java.util.Collections.emptyList(), temperature);
    }

    private ChatResponse chatInterno(String systemPrompt, List<MensagemChat> historico, String mensagemAtual,
            List<com.wmakeouthill.portfolio.application.dto.MediaPart> media, double temperature) {
        if (!vertexAiClient.isConfigured()) {
            return new ChatResponse("Serviço de IA não configurado. Configure o Vertex AI.");
        }

        // Log de tokens de entrada antes da requisição
        int tokensEntrada = tokenCounter.estimarTokens(systemPrompt) +
                tokenCounter.estimarTokens(mensagemAtual) +
                historico.stream().mapToInt(m -> tokenCounter.estimarTokens(m.content())).sum();
        log.info("Tokens estimados de entrada: {} (system prompt: {}, mensagem: {}, histórico: {})",
                tokensEntrada,
                tokenCounter.estimarTokens(systemPrompt),
                tokenCounter.estimarTokens(mensagemAtual),
                historico.size());

        // Tenta cada modelo em sequência até um funcionar
        Exception ultimoErro = null;
        for (int i = 0; i < modelosFallback.size(); i++) {
            String modeloAtual = modelosFallback.get(i);
            boolean isUltimoModelo = (i == modelosFallback.size() - 1);

            try {
                log.info("Tentando modelo Gemini {} ({}/{})",
                        modeloAtual, i + 1, modelosFallback.size());

                Map<String, Object> payload = criarPayload(systemPrompt, historico, mensagemAtual, media, temperature,
                        modeloAtual);
                String body = mapper.writeValueAsString(payload);
                HttpResponse<String> resp = vertexAiClient.generateContent(modeloAtual, body);

                // Verifica se é erro recuperável
                if (isErroRecuperavel(resp)) {
                    String erroMsg = extrairMensagemErro(resp.body());
                    log.warn("Modelo {} retornou erro recuperável (status {}): {}. Tentando próximo modelo...",
                            modeloAtual, resp.statusCode(), erroMsg);
                    ultimoErro = new IOException("Erro recuperável: " + erroMsg);
                    continue;
                }

                ChatResponse resposta = processarResposta(resp, modeloAtual);

                // Log de tokens de saída
                int tokensSaida = tokenCounter.estimarTokens(resposta.reply());
                log.info("Resposta obtida com modelo {} - Tokens estimados de saída: {}, total estimado: {}",
                        modeloAtual, tokensSaida, tokensEntrada + tokensSaida);

                return resposta;

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                ultimoErro = e;
                log.warn("Chamada ao Vertex AI interrompida no modelo {}: {}", modeloAtual, e.getMessage());
                break;
            } catch (IOException e) {
                ultimoErro = e;

                if (isUltimoModelo) {
                    log.error("Todos os modelos Gemini falharam. Último erro (modelo {}): {}",
                            modeloAtual, e.getMessage());
                } else {
                    log.warn("Erro ao comunicar com modelo {}: {}. Tentando próximo modelo...",
                            modeloAtual, e.getMessage());
                }
            }
        }

        String mensagemErro = ultimoErro != null
                ? "Erro ao comunicar com Gemini: " + ultimoErro.getMessage()
                : "Todos os modelos Gemini configurados falharam";
        return new ChatResponse(mensagemErro);
    }

    private Map<String, Object> criarPayload(String systemPrompt, List<MensagemChat> historico, String mensagemAtual,
            List<com.wmakeouthill.portfolio.application.dto.MediaPart> media, double temperature, String modelo) {
        Map<String, Object> payload = new HashMap<>();

        // System instruction (Gemini usa formato diferente do OpenAI)
        Map<String, Object> systemInstruction = new HashMap<>();
        systemInstruction.put("parts", List.of(Map.of("text", systemPrompt)));
        payload.put("systemInstruction", systemInstruction);

        // Conteúdos (histórico + mensagem atual)
        List<Map<String, Object>> contents = new ArrayList<>();

        for (MensagemChat msg : historico) {
            Map<String, Object> content = new HashMap<>();
            // Gemini usa "user" e "model" ao invés de "user" e "assistant"
            String role = "assistant".equals(msg.role()) ? "model" : msg.role();
            content.put("role", role);
            content.put("parts", List.of(Map.of("text", msg.content())));
            contents.add(content);
        }

        // Mensagem atual do usuário (texto + anexos de mídia inline)
        Map<String, Object> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        List<Map<String, Object>> userParts = new ArrayList<>();
        if (mensagemAtual != null && !mensagemAtual.isBlank()) {
            userParts.add(Map.of("text", mensagemAtual));
        }
        if (media != null) {
            for (com.wmakeouthill.portfolio.application.dto.MediaPart mp : media) {
                if (mp == null || mp.base64Data() == null || mp.base64Data().isBlank()) {
                    continue;
                }
                Map<String, Object> part = new HashMap<>();
                part.put("inlineData", Map.of(
                        "mimeType", mp.mimeType() == null ? "application/octet-stream" : mp.mimeType(),
                        "data", mp.base64Data()));
                // Para vídeo, reduz a amostragem de frames (≈ "acelerar"): baixa fps =
                // menos tokens e menor custo, mantendo a compreensão do conteúdo.
                if (mp.isVideo()) {
                    part.put("videoMetadata", Map.of("fps", 1));
                }
                userParts.add(part);
            }
        }
        if (userParts.isEmpty()) {
            userParts.add(Map.of("text", ""));
        }
        userMessage.put("parts", userParts);
        contents.add(userMessage);

        payload.put("contents", contents);

        // Configuração de geração
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", maxTokens);
        generationConfig.put("temperature", temperature);

        // Nível de raciocínio (thinking) — só os modelos Gemini 3.x aceitam
        // "thinkingLevel"; o Gemini 2.5 usa "thinkingBudget" e rejeitaria este
        // campo. "medium" equilibra qualidade e latência.
        if (modelo != null && modelo.startsWith("gemini-3") && !thinkingLevel.isBlank()) {
            generationConfig.put("thinkingConfig", Map.of("thinkingLevel", thinkingLevel));
        }
        payload.put("generationConfig", generationConfig);

        return payload;
    }

    private ChatResponse processarResposta(HttpResponse<String> resp, String modeloUsado) throws IOException {
        if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
            JsonNode root = mapper.readTree(resp.body());

            // Gemini retorna: candidates[0].content.parts[0].text
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode content = firstCandidate.path("content");
                JsonNode parts = content.path("parts");

                if (parts.isArray() && !parts.isEmpty()) {
                    String reply = parts.get(0).path("text").asText("");
                    if (reply.isBlank()) {
                        reply = "(sem resposta)";
                    }

                    logarUsoTokens(root, modeloUsado);
                    return new ChatResponse(reply.trim(), modeloUsado);
                }
            }

            log.warn("Resposta Gemini não contém candidates válidos: {}", resp.body());
            return new ChatResponse("(resposta inválida do Gemini)", modeloUsado);
        } else {
            String body = resp.body();
            log.error("Erro na API Gemini (modelo {}): status={}, body={}", modeloUsado, resp.statusCode(), body);
            throw new IOException("Erro ao chamar API Gemini: status=" + resp.statusCode());
        }
    }

    private boolean isErroRecuperavel(HttpResponse<String> resp) {
        int statusCode = resp.statusCode();
        // Rate limit (429), Too Many Requests, ou erros temporários do servidor
        if (statusCode == 429 || statusCode == 502 || statusCode == 503 || statusCode == 504) {
            return true;
        }

        if (statusCode >= 400 && statusCode < 500) {
            String body = resp.body();
            if (body != null) {
                String bodyLower = body.toLowerCase();
                return bodyLower.contains("rate limit") ||
                        bodyLower.contains("quota") ||
                        bodyLower.contains("resource_exhausted");
            }
        }

        return false;
    }

    private String extrairMensagemErro(String body) {
        if (body == null || body.isBlank()) {
            return "Erro desconhecido";
        }

        try {
            JsonNode root = mapper.readTree(body);
            JsonNode error = root.path("error");
            if (!error.isMissingNode()) {
                JsonNode message = error.path("message");
                if (!message.isMissingNode()) {
                    return message.asText();
                }
            }
        } catch (Exception e) {
            // Ignora erro de parsing
        }

        return body.length() > 200 ? body.substring(0, 200) + "..." : body;
    }

    private void logarUsoTokens(JsonNode root, String modeloUsado) {
        try {
            JsonNode usageMetadata = root.path("usageMetadata");
            if (!usageMetadata.isMissingNode()) {
                int promptTokens = usageMetadata.path("promptTokenCount").asInt(0);
                int candidatesTokens = usageMetadata.path("candidatesTokenCount").asInt(0);
                int totalTokens = usageMetadata.path("totalTokenCount").asInt(0);

                if (totalTokens > 0) {
                    log.info("Uso de tokens (Gemini {}): entrada={}, saída={}, total={}",
                            modeloUsado, promptTokens, candidatesTokens, totalTokens);
                }
            }
        } catch (Exception e) {
            log.debug("Não foi possível extrair informações de uso de tokens", e);
        }
    }
}
