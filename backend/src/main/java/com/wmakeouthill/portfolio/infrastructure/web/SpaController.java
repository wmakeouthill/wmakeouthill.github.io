package com.wmakeouthill.portfolio.infrastructure.web;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Objects;

/**
 * Controller para servir arquivos estáticos do frontend e index.html para rotas
 * do SPA.
 * 
 * Pode ser desativado via configuração: frontend.enabled=false
 */
@Controller
@RequestMapping
@RequiredArgsConstructor
public class SpaController {

    @Value("${frontend.path:}")
    private String frontendPath;

    @Value("${frontend.enabled:true}")
    private boolean frontendEnabled;

    @GetMapping("/**")
    public ResponseEntity<Resource> servirRecurso(HttpServletRequest request) {
        // Se frontend está desativado, retorna 404 para todas as requisições não-API
        if (!frontendEnabled) {
            return ResponseEntity.notFound().build();
        }

        String uri = request.getRequestURI();

        if (deveIgnorar(uri)) {
            return ResponseEntity.notFound().build();
        }

        Resource arquivo = buscarArquivo(uri);
        if (arquivo == null || !arquivo.exists()) {
            return servirIndexHtml();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, obterContentType(uri))
                .body(arquivo);
    }

    private boolean deveIgnorar(String uri) {
        return uri.startsWith("/api/");
    }

    private Resource buscarArquivo(String uri) {
        if (!temExtensao(uri)) {
            return null;
        }

        String caminhoArquivo = uri.startsWith("/") ? uri.substring(1) : uri;

        Resource doClasspath = buscarDoClasspath(caminhoArquivo);
        if (doClasspath != null) {
            try {
                if (doClasspath.exists() && doClasspath.isReadable()) {
                    return doClasspath;
                }
            } catch (Exception e) {
                // Ignora e tenta filesystem
            }
        }

        return buscarDoFileSystem(caminhoArquivo);
    }

    private boolean temExtensao(String uri) {
        int ultimoPonto = uri.lastIndexOf('.');
        int ultimaBarra = uri.lastIndexOf('/');
        return ultimoPonto > ultimaBarra && ultimoPonto < uri.length() - 1;
    }

    private Resource buscarDoFileSystem(String caminhoArquivo) {
        if (frontendPath == null || frontendPath.isBlank()) {
            return null;
        }

        try {
            Path caminhoBase = Paths.get(frontendPath);
            if (!Files.exists(caminhoBase)) {
                return null;
            }

            Path caminho = caminhoBase.resolve(caminhoArquivo).toAbsolutePath().normalize();

            if (Files.exists(caminho) && Files.isRegularFile(caminho)) {
                return new UrlResource(Objects.requireNonNull(caminho.toUri()));
            }
        } catch (Exception e) {
            // Ignora e usa fallback
        }
        return null;
    }

    private Resource buscarDoClasspath(String caminhoArquivo) {
        try {
            ClassPathResource resource = new ClassPathResource("static/" + caminhoArquivo);
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (Exception e) {
            // Ignora - arquivo não existe no classpath
        }
        return null;
    }

    private ResponseEntity<Resource> servirIndexHtml() {
        Resource index = buscarIndex();
        if (index == null || !index.exists()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(Objects.requireNonNull(MediaType.TEXT_HTML))
                .body(index);
    }

    private Resource buscarIndex() {
        Resource doClasspath = buscarIndexDoClasspath();
        if (doClasspath != null) {
            try {
                if (doClasspath.exists() && doClasspath.isReadable()) {
                    return doClasspath;
                }
            } catch (Exception e) {
                // Ignora e tenta filesystem
            }
        }

        return buscarIndexDoFileSystem();
    }

    private Resource buscarIndexDoFileSystem() {
        if (frontendPath == null || frontendPath.isBlank()) {
            return null;
        }

        try {
            Path caminhoBase = Paths.get(frontendPath);
            if (!Files.exists(caminhoBase)) {
                return null;
            }

            Path caminho = caminhoBase.resolve("index.html").toAbsolutePath().normalize();
            if (Files.exists(caminho)) {
                return new UrlResource(Objects.requireNonNull(caminho.toUri()));
            }
        } catch (Exception e) {
            // Ignora e usa fallback
        }
        return null;
    }

    private Resource buscarIndexDoClasspath() {
        try {
            ClassPathResource resource = new ClassPathResource("static/index.html");
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (Exception e) {
            // Ignora - arquivo não existe no classpath
        }
        return null;
    }

    private String obterContentType(String uri) {
        if (uri.endsWith(".js") || uri.endsWith(".mjs"))
            return "application/javascript";
        if (uri.endsWith(".css"))
            return "text/css";
        if (uri.endsWith(".html"))
            return "text/html";
        if (uri.endsWith(".json"))
            return "application/json";
        if (uri.endsWith(".png"))
            return "image/png";
        if (uri.endsWith(".jpg") || uri.endsWith(".jpeg"))
            return "image/jpeg";
        if (uri.endsWith(".svg"))
            return "image/svg+xml";
        if (uri.endsWith(".ico"))
            return "image/x-icon";
        if (uri.endsWith(".woff") || uri.endsWith(".woff2"))
            return "font/woff2";
        if (uri.endsWith(".ttf"))
            return "font/ttf";
        if (uri.endsWith(".pdf"))
            return "application/pdf";
        if (uri.endsWith(".mp4"))
            return "video/mp4";
        if (uri.endsWith(".webm"))
            return "video/webm";
        return "application/octet-stream";
    }
}
