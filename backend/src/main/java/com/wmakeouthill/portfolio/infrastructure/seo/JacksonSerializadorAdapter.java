package com.wmakeouthill.portfolio.infrastructure.seo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.application.port.out.SerializadorJsonPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Serializa para JSON usando o {@link ObjectMapper} gerenciado pelo Spring
 * (sem instanciar mapper manualmente).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JacksonSerializadorAdapter implements SerializadorJsonPort {

  private final ObjectMapper objectMapper;

  @Override
  public String serializar(Object valor) {
    try {
      return objectMapper.writeValueAsString(valor);
    } catch (JsonProcessingException e) {
      log.warn("Falha ao serializar JSON-LD: {}", e.getMessage());
      return "{}";
    }
  }
}
