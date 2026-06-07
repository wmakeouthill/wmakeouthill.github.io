package com.wmakeouthill.portfolio.infrastructure.ai;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Component
public class VertexAiClient {
    private static final String CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
    private static final Pattern RESOURCE_ID = Pattern.compile("[a-zA-Z0-9._:-]+");

    private final HttpClient http = HttpClient.newHttpClient();
    private final GoogleCredentials credentials;
    private final String projectId;
    private final String location;

    public VertexAiClient(
            @Value("${vertex.ai.enabled:true}") boolean enabled,
            @Value("${vertex.ai.project-id:}") String projectId,
            @Value("${vertex.ai.location:global}") String location) {
        String configuredProjectId = projectId == null ? "" : projectId.trim();
        this.location = location == null || location.isBlank() ? "global" : location.trim();
        this.credentials = enabled ? carregarCredenciais() : null;
        this.projectId = resolverProjectId(configuredProjectId, this.credentials);

        if (isConfigured()) {
            log.info("Vertex AI configurado no projeto {} e localização {}", this.projectId, this.location);
        } else {
            log.warn("Vertex AI não configurado. Defina VERTEX_AI_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS.");
        }
    }

    public boolean isConfigured() {
        return credentials != null && !projectId.isBlank();
    }

    public HttpResponse<String> generateContent(String model, String body) throws IOException, InterruptedException {
        if (!isConfigured()) {
            throw new IOException("Vertex AI não configurado");
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(buildEndpoint(model)))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + getAccessToken())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    String buildEndpoint(String model) {
        validarResourceId("project-id", projectId);
        validarResourceId("location", location);
        validarResourceId("model", model);

        String host = "global".equals(location)
                ? "aiplatform.googleapis.com"
                : location + "-aiplatform.googleapis.com";
        return "https://" + host + "/v1/projects/" + projectId + "/locations/" + location
                + "/publishers/google/models/" + model + ":generateContent";
    }

    private String getAccessToken() throws IOException {
        credentials.refreshIfExpired();
        AccessToken accessToken = credentials.getAccessToken();
        if (accessToken == null || accessToken.getTokenValue() == null || accessToken.getTokenValue().isBlank()) {
            credentials.refresh();
            accessToken = credentials.getAccessToken();
        }
        if (accessToken == null || accessToken.getTokenValue() == null || accessToken.getTokenValue().isBlank()) {
            throw new IOException("Não foi possível obter token OAuth para o Vertex AI");
        }
        return accessToken.getTokenValue();
    }

    private GoogleCredentials carregarCredenciais() {
        try {
            return GoogleCredentials.getApplicationDefault().createScoped(List.of(CLOUD_PLATFORM_SCOPE));
        } catch (IOException e) {
            log.warn("Credencial Google não encontrada para o Vertex AI: {}", e.getMessage());
            return null;
        }
    }

    private String resolverProjectId(String configuredProjectId, GoogleCredentials loadedCredentials) {
        if (!configuredProjectId.isBlank()) {
            return configuredProjectId;
        }
        if (loadedCredentials instanceof ServiceAccountCredentials serviceAccountCredentials) {
            String credentialsProjectId = serviceAccountCredentials.getProjectId();
            return credentialsProjectId == null ? "" : credentialsProjectId.trim();
        }
        return "";
    }

    private void validarResourceId(String campo, String valor) {
        if (valor == null || valor.isBlank() || !RESOURCE_ID.matcher(valor).matches()) {
            throw new IllegalArgumentException("Valor inválido para Vertex AI " + campo);
        }
    }
}
