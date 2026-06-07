package com.wmakeouthill.portfolio.infrastructure.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VertexAiClientTest {

    @Test
    void deveMontarEndpointGlobal() {
        VertexAiClient client = new VertexAiClient(false, "meu-projeto-123", "global");

        assertThat(client.buildEndpoint("gemini-2.5-flash-lite"))
                .isEqualTo("https://aiplatform.googleapis.com/v1/projects/meu-projeto-123/locations/global"
                        + "/publishers/google/models/gemini-2.5-flash-lite:generateContent");
    }

    @Test
    void deveMontarEndpointRegional() {
        VertexAiClient client = new VertexAiClient(false, "meu-projeto-123", "us-central1");

        assertThat(client.buildEndpoint("gemini-2.5-flash"))
                .startsWith("https://us-central1-aiplatform.googleapis.com/v1/projects/meu-projeto-123/");
    }

    @Test
    void deveRejeitarModeloInvalido() {
        VertexAiClient client = new VertexAiClient(false, "meu-projeto-123", "global");

        assertThatThrownBy(() -> client.buildEndpoint("../modelo"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
