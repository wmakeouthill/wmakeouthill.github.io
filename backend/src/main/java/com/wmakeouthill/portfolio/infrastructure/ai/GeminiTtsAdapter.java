package com.wmakeouthill.portfolio.infrastructure.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class GeminiTtsAdapter {
    private static final int SAMPLE_RATE = 24000;
    private static final short CHANNELS = 1;
    private static final short BITS_PER_SAMPLE = 16;

    private final ObjectMapper mapper = new ObjectMapper();
    private final VertexAiClient vertexAiClient;
    private final String model;
    private final String voiceName;

    public GeminiTtsAdapter(
            VertexAiClient vertexAiClient,
            @Value("${gemini.tts.model:gemini-2.5-flash-tts}") String model,
            @Value("${gemini.tts.voice:Puck}") String voiceName) {
        this.vertexAiClient = vertexAiClient;
        this.model = model;
        this.voiceName = voiceName;
    }

    public Optional<String> sintetizarWavBase64(String texto) {
        if (!vertexAiClient.isConfigured() || texto == null || texto.isBlank()) {
            return Optional.empty();
        }

        try {
            String body = mapper.writeValueAsString(criarPayload(texto));
            HttpResponse<String> response = vertexAiClient.generateContent(model, body);
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Gemini TTS falhou com status {}: {}", response.statusCode(), response.body());
                return Optional.empty();
            }

            return extrairAudio(response.body());
        } catch (IOException e) {
            log.warn("Erro ao gerar TTS Gemini: {}", e.getMessage());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("TTS Gemini interrompido: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Map<String, Object> criarPayload(String texto) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", montarPrompt(texto))))));
        payload.put("generationConfig", Map.of(
                "responseModalities", List.of("AUDIO"),
                "speechConfig", Map.of(
                        "voiceConfig", Map.of(
                                "prebuiltVoiceConfig", Map.of("voiceName", voiceName)))));
        return payload;
    }

    private String montarPrompt(String texto) {
        return "Leia a resposta a seguir em portugues brasileiro com voz de menino robozinho ajudante de IA. "
                + "O tom deve ser jovem, natural, simpatico e levemente digital, como um robo fofo e esperto, "
                + "mas sem ficar travado, monotono ou dificil de entender.\n\n"
                + texto;
    }

    private Optional<String> extrairAudio(String body) throws IOException {
        JsonNode parts = mapper.readTree(body).path("candidates").path(0).path("content").path("parts");
        if (!parts.isArray()) {
            return Optional.empty();
        }

        for (JsonNode part : parts) {
            JsonNode inlineData = part.path("inlineData");
            String audioBase64 = inlineData.path("data").asText("");
            String mimeType = inlineData.path("mimeType").asText("");
            if (audioBase64.isBlank()) {
                continue;
            }

            if (mimeType.toLowerCase().contains("wav")) {
                return Optional.of(audioBase64);
            }

            byte[] pcm = Base64.getDecoder().decode(audioBase64);
            byte[] wav = criarWav(pcm);
            return Optional.of(Base64.getEncoder().encodeToString(wav));
        }

        return Optional.empty();
    }

    private byte[] criarWav(byte[] pcm) throws IOException {
        int byteRate = SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE / 8;
        short blockAlign = (short) (CHANNELS * BITS_PER_SAMPLE / 8);
        ByteArrayOutputStream out = new ByteArrayOutputStream(44 + pcm.length);

        out.write("RIFF".getBytes());
        escreverInt(out, 36 + pcm.length);
        out.write("WAVE".getBytes());
        out.write("fmt ".getBytes());
        escreverInt(out, 16);
        escreverShort(out, (short) 1);
        escreverShort(out, CHANNELS);
        escreverInt(out, SAMPLE_RATE);
        escreverInt(out, byteRate);
        escreverShort(out, blockAlign);
        escreverShort(out, BITS_PER_SAMPLE);
        out.write("data".getBytes());
        escreverInt(out, pcm.length);
        out.write(pcm);

        return out.toByteArray();
    }

    private void escreverInt(ByteArrayOutputStream out, int value) throws IOException {
        out.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(value).array());
    }

    private void escreverShort(ByteArrayOutputStream out, short value) throws IOException {
        out.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(value).array());
    }

}
