package com.wmakeouthill.portfolio.infrastructure.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Controller de health check.
 * Isento do filtro ApiKeyAuthFilter — não requer header X-API-Key.
 * Usado para monitoramento e verificação de deploy.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final Instant START_TIME = Instant.now();

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "timestamp", Instant.now().toString(),
                "uptime", java.time.Duration.between(START_TIME, Instant.now()).toString(),
                "version", "0.1.0",
                "environment", System.getenv("SPRING_PROFILES_ACTIVE") != null
                        ? System.getenv("SPRING_PROFILES_ACTIVE")
                        : "dev"));
    }
}
