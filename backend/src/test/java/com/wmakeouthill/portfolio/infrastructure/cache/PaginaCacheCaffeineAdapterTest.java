package com.wmakeouthill.portfolio.infrastructure.cache;

import com.wmakeouthill.portfolio.application.cache.PaginaCacheada;
import com.wmakeouthill.portfolio.infrastructure.config.SsrProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;

class PaginaCacheCaffeineAdapterTest {

  private PaginaCacheCaffeineAdapter adapter;

  @BeforeEach
  void setUp() {
    adapter = new PaginaCacheCaffeineAdapter(propriedadesPadrao());
    adapter.inicializar();
  }

  @Test
  void buscar_deveRetornarVazio_quandoChaveInexistente() {
    Optional<PaginaCacheada> resultado = adapter.buscar("html:/inexistente");

    assertThat(resultado).isEmpty();
  }

  @Test
  void armazenarEBuscar_deveRetornarPaginaFresca() {
    PaginaCacheada pagina = PaginaCacheada.criar("<html>home</html>", 200, "etag-1",
        900, 86400, Set.of("home"), 12);

    adapter.armazenar("html:/", pagina);
    Optional<PaginaCacheada> resultado = adapter.buscar("html:/");

    assertThat(resultado).isPresent();
    assertThat(resultado.get().html()).isEqualTo("<html>home</html>");
    assertThat(resultado.get().estaFresca(Instant.now())).isTrue();
  }

  @Test
  void paginaExpirada_deveServirComoStaleDentroDaJanela() {
    Instant agora = Instant.now();
    PaginaCacheada expirada = new PaginaCacheada("<html>stale</html>", 200, "e",
        agora.minusSeconds(1000), agora.minusSeconds(100), agora.plusSeconds(1000), Set.of(), 5);

    assertThat(expirada.estaFresca(agora)).isFalse();
    assertThat(expirada.podeServirStale(agora)).isTrue();
  }

  @Test
  void invalidar_deveRemoverChaveEspecifica() {
    adapter.armazenar("html:/", PaginaCacheada.criar("a", 200, null, 900, 86400, Set.of(), 1));

    adapter.invalidar("html:/");

    assertThat(adapter.buscar("html:/")).isEmpty();
  }

  @Test
  void invalidarPorTag_deveRemoverTodasAsChavesDaTag() {
    adapter.armazenar("html:/projects", PaginaCacheada.criar("lista", 200, null, 900, 86400, Set.of("projects"), 1));
    adapter.armazenar("html:/projects/aa-space",
        PaginaCacheada.criar("detalhe", 200, null, 900, 86400, Set.of("projects", "project:aa-space"), 1));
    adapter.armazenar("html:/", PaginaCacheada.criar("home", 200, null, 900, 86400, Set.of("home"), 1));

    adapter.invalidarPorTag("projects");

    assertThat(adapter.buscar("html:/projects")).isEmpty();
    assertThat(adapter.buscar("html:/projects/aa-space")).isEmpty();
    assertThat(adapter.buscar("html:/")).isPresent();
  }

  @Test
  void singleFlight_segundoChamadorNaoObtemLockEnquantoOcupado() throws Exception {
    boolean primeiro = adapter.tentarObterLock("html:/", 0);
    assertThat(primeiro).isTrue();

    boolean segundoEnquantoOcupado = CompletableFuture
        .supplyAsync(() -> adapter.tentarObterLock("html:/", 0))
        .get();
    assertThat(segundoEnquantoOcupado).isFalse();

    adapter.liberarLock("html:/");

    boolean depoisDeLiberar = CompletableFuture
        .supplyAsync(() -> adapter.tentarObterLock("html:/", 0))
        .get();
    assertThat(depoisDeLiberar).isTrue();
  }

  @Test
  void criar_deveGarantirStaleNuncaMenorQueTtl() {
    PaginaCacheada pagina = PaginaCacheada.criar("x", 200, null, 900, 100, Set.of(), 0);

    assertThat(pagina.staleAte()).isAfterOrEqualTo(pagina.frescoAte());
  }

  private SsrProperties propriedadesPadrao() {
    return new SsrProperties(false, false,
        new SsrProperties.Renderer("http://127.0.0.1:4000/render", 5),
        new SsrProperties.Cache(2,
            new SsrProperties.Html(900, 86400, 500),
            new SsrProperties.Data(300, 3600, 500),
            new SsrProperties.Markdown(21600, 200),
            new SsrProperties.Mermaid(86400, 500),
            new SsrProperties.Warmup(true, 20)));
  }
}
