package com.wmakeouthill.portfolio.infrastructure.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.port.out.AIChatPort;
import com.wmakeouthill.portfolio.domain.entity.MensagemChat;
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
import java.util.List;
import java.util.Map;

/**
 * Adapter para integração com a API da OpenAI.
 * A chave deve ser fornecida via variável de ambiente `OPENAI_API_KEY`
 * ou via propriedade `-Dopenai.api.key=...`.
 */
@Component
public class OpenAIAdapter implements AIChatPort {
    private static final Logger log = LoggerFactory.getLogger(OpenAIAdapter.class);
    private static final String DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODELO_PADRAO = "gpt-3.5-turbo";
    private static final int MAX_TOKENS = 300;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;

    public OpenAIAdapter(@Value("${openai.api.key:}") String openaiApiKey) {
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
    }

    @Override
    public ChatResponse chat(String systemPrompt, List<MensagemChat> historico, String mensagemAtual) {
        if (apiKey == null || apiKey.isBlank()) {
            return new ChatResponse("Serviço de IA não configurado. Defina a variável OPENAI_API_KEY.");
        }

        try {
            List<Map<String, Object>> mensagens = construirMensagens(systemPrompt, historico, mensagemAtual);
            Map<String, Object> payload = criarPayload(mensagens);
            String body = mapper.writeValueAsString(payload);

            HttpRequest req = criarRequisicao(body);
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());

            return processarResposta(resp);
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Erro ao comunicar com OpenAI", e);
            return new ChatResponse("Erro ao comunicar com IA: " + e.getMessage());
        }
    }

    private List<Map<String, Object>> construirMensagens(String systemPrompt, List<MensagemChat> historico,
            String mensagemAtual) {
        List<Map<String, Object>> mensagens = new ArrayList<>();
        mensagens.add(Map.of("role", "system", "content", systemPrompt));

        for (MensagemChat msg : historico) {
            mensagens.add(Map.of("role", msg.role(), "content", msg.content()));
        }

        mensagens.add(Map.of("role", "user", "content", mensagemAtual));
        return mensagens;
    }

    private Map<String, Object> criarPayload(List<Map<String, Object>> mensagens) {
        return Map.of(
                "model", MODELO_PADRAO,
                "messages", mensagens,
                "max_tokens", MAX_TOKENS,
                "temperature", 0.9);
    }

    private HttpRequest criarRequisicao(String body) {
        return HttpRequest.newBuilder()
                .uri(URI.create(DEFAULT_API_URL))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
    }

    private ChatResponse processarResposta(HttpResponse<String> resp) throws IOException {
        if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
            JsonNode root = mapper.readTree(resp.body());
            JsonNode first = root.path("choices").path(0).path("message").path("content");
            String reply = first.isMissingNode() ? "" : first.asText();
            if (reply == null || reply.isBlank()) {
                reply = "(sem resposta)";
            }
            return new ChatResponse(reply.trim());
        } else {
            log.error("Erro na API OpenAI: status={}, body={}", resp.statusCode(), resp.body());
            return new ChatResponse("Erro ao chamar API de IA: status=" + resp.statusCode());
        }
    }
}
