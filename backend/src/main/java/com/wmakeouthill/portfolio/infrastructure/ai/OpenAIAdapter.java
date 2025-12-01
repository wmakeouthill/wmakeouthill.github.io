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
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Adapter para integração com a API da OpenAI.
 * A chave deve ser fornecida via variável de ambiente `OPENAI_API_KEY`
 * ou via propriedade `-Dopenai.api.key=...`.
 * O modelo pode ser configurado via propriedade `openai.model` (padrão: gpt-5-mini).
 */
@Component
public class OpenAIAdapter implements AIChatPort {
    private static final Logger log = LoggerFactory.getLogger(OpenAIAdapter.class);
    private static final String DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODELO_PADRAO_FALLBACK = "gpt-5-mini";
    private static final int MAX_TOKENS_PADRAO = 4000;
    private static final String KEY_CONTENT = "content";

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();
    private final TokenCounter tokenCounter = TokenCounter.getInstance();
    private final String apiKey;
    private final List<String> modelosFallback;
    private final int maxTokens;

    public OpenAIAdapter(
            @Value("${openai.api.key:}") String openaiApiKey,
            @Value("${openai.model:" + MODELO_PADRAO_FALLBACK + "}") String modelo,
            @Value("${openai.models.fallback:}") String modelosFallbackStr,
            @Value("${openai.max-tokens:" + MAX_TOKENS_PADRAO + "}") int maxTokens) {
        this.maxTokens = maxTokens;
        
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
        if (openaiApiKey != null && !openaiApiKey.isBlank()) {
            this.apiKey = openaiApiKey;
            log.info("OpenAI key carregada via Spring property 'openai.api.key'");
        } else {
            String envKey = System.getenv("OPENAI_API_KEY");
            if (envKey != null && !envKey.isBlank()) {
                this.apiKey = envKey;
                log.info("OpenAI key carregada via environment variable 'OPENAI_API_KEY'");
            } else {
                this.apiKey = null;
                log.warn("OpenAI key NÃO encontrada! Verifique:");
                log.warn("  1. Variável de ambiente OPENAI_API_KEY");
                log.warn("  2. Propriedade openai.api.key no application.properties");
                log.warn("  3. Arquivo configmap-local.properties carregado via spring.config.additional-location");
            }
        }
        log.info("OpenAI Adapter configurado com {} modelo(s) de fallback: {}, max_tokens: {}", 
                this.modelosFallback.size(), this.modelosFallback, this.maxTokens);
    }

    @Override
    public ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual) {
        if (apiKey == null || apiKey.isBlank()) {
            return new ChatResponse("Serviço de IA não configurado. Defina a variável OPENAI_API_KEY.");
        }

        List<Map<String, Object>> mensagens = construirMensagens(systemPrompt, historico, mensagemAtual);
        
        // Log de tokens de entrada antes da requisição
        int tokensEntrada = tokenCounter.estimarTokensEntrada(systemPrompt, mensagens);
        log.info("Tokens estimados de entrada: {} (system prompt: {}, mensagens: {}, histórico: {})", 
            tokensEntrada,
            tokenCounter.estimarTokensSystemPrompt(systemPrompt),
            mensagens.size(),
            historico.size());
        
        // Tenta cada modelo em sequência até um funcionar
        Exception ultimoErro = null;
        for (int i = 0; i < modelosFallback.size(); i++) {
            String modeloAtual = modelosFallback.get(i);
            boolean isUltimoModelo = (i == modelosFallback.size() - 1);
            
            try {
                log.debug("Tentando modelo {} ({}/{})", modeloAtual, i + 1, modelosFallback.size());
                
                Map<String, Object> payload = criarPayload(mensagens, modeloAtual);
                String body = mapper.writeValueAsString(payload);
                HttpRequest req = criarRequisicao(body);
                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());

                // Verifica se é erro de rate limit ou outro erro recuperável
                if (isErroRecuperavel(resp)) {
                    String erroMsg = extrairMensagemErro(resp.body());
                    log.warn("Modelo {} retornou erro recuperável (status {}): {}. Tentando próximo modelo...", 
                            modeloAtual, resp.statusCode(), erroMsg);
                    ultimoErro = new IOException("Erro recuperável: " + erroMsg);
                    continue; // Tenta próximo modelo
                }
                
                ChatResponse resposta = processarResposta(resp, modeloAtual);
                
                // Log de tokens de saída após a requisição
                int tokensSaida = tokenCounter.estimarTokensResposta(resposta.reply());
                log.info("Resposta obtida com modelo {} - Tokens estimados de saída: {}, total estimado: {}", 
                    modeloAtual, tokensSaida, tokensEntrada + tokensSaida);
                
                return resposta;
                
            } catch (IOException | InterruptedException e) {
                Thread.currentThread().interrupt();
                ultimoErro = e;
                
                if (isUltimoModelo) {
                    log.error("Todos os modelos falharam. Último erro ao comunicar com OpenAI (modelo {}): {}", 
                            modeloAtual, e.getMessage());
                } else {
                    log.warn("Erro ao comunicar com modelo {}: {}. Tentando próximo modelo...", 
                            modeloAtual, e.getMessage());
                }
            }
        }
        
        // Se chegou aqui, todos os modelos falharam
        String mensagemErro = ultimoErro != null 
                ? "Erro ao comunicar com IA: " + ultimoErro.getMessage()
                : "Todos os modelos configurados falharam";
        return new ChatResponse(mensagemErro);
    }

    private List<Map<String, Object>> construirMensagens(String systemPrompt, List<MensagemChat> historico,
            String mensagemAtual) {
        List<Map<String, Object>> mensagens = new ArrayList<>();
        mensagens.add(Map.of("role", "system", KEY_CONTENT, systemPrompt));

        for (MensagemChat msg : historico) {
            mensagens.add(Map.of("role", msg.role(), KEY_CONTENT, msg.content()));
        }

        mensagens.add(Map.of("role", "user", KEY_CONTENT, mensagemAtual));
        return mensagens;
    }

    private Map<String, Object> criarPayload(List<Map<String, Object>> mensagens) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", modelo);
        payload.put("messages", mensagens);
        
        // Modelos GPT-5 requerem max_completion_tokens ao invés de max_tokens
        // e não suportam customização de temperature (apenas valor padrão 1)
        if (requerMaxCompletionTokens(modelo)) {
            payload.put("max_completion_tokens", maxTokens);
            // GPT-5 não aceita temperature customizado, apenas o padrão (1)
        } else {
            payload.put("max_tokens", maxTokens);
            payload.put("temperature", 0.9);
        }
        
        return payload;
    }
    
    private boolean requerMaxCompletionTokens(String modelo) {
        if (modelo == null || modelo.isBlank()) {
            return false;
        }
        // Modelos da família GPT-5 requerem max_completion_tokens
        return modelo.startsWith("gpt-5");
    }

    private HttpRequest criarRequisicao(String body) {
        return HttpRequest.newBuilder()
                .uri(URI.create(DEFAULT_API_URL))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
    }

    private ChatResponse processarResposta(HttpResponse<String> resp) throws IOException {
        if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
            JsonNode root = mapper.readTree(resp.body());
            JsonNode first = root.path("choices").path(0).path("message").path(KEY_CONTENT);
            String reply = first.isMissingNode() ? "" : first.asText();
            if (reply == null || reply.isBlank()) {
                reply = "(sem resposta)";
            }
            
            // Tenta extrair informações de uso de tokens da resposta (se disponível)
            logarUsoTokens(root);
            
            return new ChatResponse(reply.trim());
        } else {
            String body = resp.body();
            log.error("Erro na API OpenAI: status={}, body={}", resp.statusCode(), body);
            return new ChatResponse("Erro ao chamar API de IA: status=" + resp.statusCode());
        }
    }
    
    private void logarUsoTokens(JsonNode root) {
        try {
            JsonNode usage = root.path("usage");
            if (!usage.isMissingNode()) {
                int promptTokens = usage.path("prompt_tokens").asInt(0);
                int completionTokens = usage.path("completion_tokens").asInt(0);
                int totalTokens = usage.path("total_tokens").asInt(0);
                
                if (totalTokens > 0) {
                    log.info("Uso de tokens (da API OpenAI): entrada={}, saída={}, total={}", 
                        promptTokens, completionTokens, totalTokens);
                }
            }
        } catch (Exception e) {
            log.debug("Não foi possível extrair informações de uso de tokens da resposta", e);
        }
    }
}
