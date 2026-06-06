package com.wmakeouthill.portfolio.infrastructure.ssr;

import com.wmakeouthill.portfolio.application.cache.ResultadoRenderizacao;
import com.wmakeouthill.portfolio.application.port.out.SsrRendererPort;
import com.wmakeouthill.portfolio.infrastructure.config.SsrProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Adapter HTTP que delega a renderização ao servidor Node (Express + Angular
 * SSR). O Node renderiza qualquer rota pública via catch-all, então basta
 * concatenar o caminho à base configurada em {@code ssr.renderer.url}.
 *
 * <p>Falhas (timeout, conexão recusada, 5xx) viram {@link ResultadoRenderizacao}
 * com status 502: o use case decide se serve stale ou propaga o erro, mantendo
 * o renderer como detalhe de infraestrutura.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NodeSsrRendererAdapter implements SsrRendererPort {

  private static final int STATUS_FALHA_GATEWAY = 502;

  private final SsrProperties ssrProperties;

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(5))
      .build();

  @Override
  public ResultadoRenderizacao renderizar(String caminho, String idioma) {
    String url = ssrProperties.renderer().baseUrlSemBarraFinal() + normalizar(caminho);
    try {
      HttpResponse<String> resposta = httpClient.send(
          montarRequisicao(url, idioma), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      return new ResultadoRenderizacao(resposta.body(), resposta.statusCode());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("Render SSR interrompido para {}", caminho);
      return falha();
    } catch (Exception e) {
      log.warn("Falha ao renderizar {} no Node: {}", caminho, e.getMessage());
      return falha();
    }
  }

  private HttpRequest montarRequisicao(String url, String idioma) {
    return HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(ssrProperties.renderer().timeoutSeconds()))
        .header("Accept", "text/html")
        .header("X-Language", idioma)
        .header("Accept-Language", idioma)
        .GET()
        .build();
  }

  private String normalizar(String caminho) {
    if (caminho == null || caminho.isBlank()) {
      return "/";
    }
    return caminho.startsWith("/") ? caminho : "/" + caminho;
  }

  private ResultadoRenderizacao falha() {
    return new ResultadoRenderizacao(null, STATUS_FALHA_GATEWAY);
  }
}
