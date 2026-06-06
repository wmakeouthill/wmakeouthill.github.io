package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.cache.PaginaCacheada;
import com.wmakeouthill.portfolio.application.cache.RespostaPaginaPublica;
import com.wmakeouthill.portfolio.application.cache.ResultadoRenderizacao;
import com.wmakeouthill.portfolio.application.cache.StatusCache;
import com.wmakeouthill.portfolio.application.port.out.PaginaCachePort;
import com.wmakeouthill.portfolio.application.port.out.SsrRendererPort;
import com.wmakeouthill.portfolio.infrastructure.config.SsrProperties;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.assertj.core.api.Assertions.assertThat;

class RenderizarPaginaPublicaUseCaseTest {

  private final AtomicInteger renders = new AtomicInteger();

  @Test
  void cacheMiss_deveRenderizarEArmazenarComoMiss() {
    FakePaginaCache cache = new FakePaginaCache();
    var useCase = montar(cache, false, (caminho, idioma) -> ok("<html>render-" + renders.incrementAndGet() + "</html>"));

    RespostaPaginaPublica resposta = useCase.executar("/", "pt");

    assertThat(resposta.statusCache()).isEqualTo(StatusCache.MISS);
    assertThat(resposta.status()).isEqualTo(200);
    assertThat(renders.get()).isEqualTo(1);
    assertThat(cache.buscar("pt|/")).isPresent();
  }

  @Test
  void cacheFresco_deveServirHitSemRenderizar() {
    FakePaginaCache cache = new FakePaginaCache();
    cache.armazenar("pt|/", PaginaCacheada.criar("<html>fresco</html>", 200, "\"e1\"",
        900, 86400, Set.of("home"), 3));
    var useCase = montar(cache, false, (caminho, idioma) -> ok("<html>novo</html>"));

    RespostaPaginaPublica resposta = useCase.executar("/", "pt");

    assertThat(resposta.statusCache()).isEqualTo(StatusCache.HIT);
    assertThat(resposta.html()).isEqualTo("<html>fresco</html>");
    assertThat(renders.get()).isZero();
  }

  @Test
  void cacheExpiradoMasStale_deveServirStaleERevalidarEmBackground() {
    FakePaginaCache cache = new FakePaginaCache();
    Instant agora = Instant.now();
    cache.armazenar("pt|/", new PaginaCacheada("<html>velho</html>", 200, "\"e1\"",
        agora.minusSeconds(1000), agora.minusSeconds(100), agora.plusSeconds(10_000), Set.of("home"), 3));
    var useCase = montar(cache, false, (caminho, idioma) -> {
      renders.incrementAndGet();
      return ok("<html>fresquinho</html>");
    });

    RespostaPaginaPublica resposta = useCase.executar("/", "pt");

    assertThat(resposta.statusCache()).isEqualTo(StatusCache.STALE);
    assertThat(resposta.html()).isEqualTo("<html>velho</html>");
    // Executor síncrono: a revalidação já rodou e atualizou o cache.
    assertThat(renders.get()).isEqualTo(1);
    assertThat(cache.buscar("pt|/").orElseThrow().html()).isEqualTo("<html>fresquinho</html>");
  }

  @Test
  void bypassLigado_deveRenderizarSempreSemCachear() {
    FakePaginaCache cache = new FakePaginaCache();
    var useCase = montar(cache, true, (caminho, idioma) -> {
      renders.incrementAndGet();
      return ok("<html>bypass</html>");
    });

    RespostaPaginaPublica primeira = useCase.executar("/", "pt");
    RespostaPaginaPublica segunda = useCase.executar("/", "pt");

    assertThat(primeira.statusCache()).isEqualTo(StatusCache.BYPASS);
    assertThat(segunda.statusCache()).isEqualTo(StatusCache.BYPASS);
    assertThat(renders.get()).isEqualTo(2);
    assertThat(cache.buscar("pt|/")).isEmpty();
  }

  @Test
  void renderFalha_deveRetornarStatusSemCachear() {
    FakePaginaCache cache = new FakePaginaCache();
    var useCase = montar(cache, false, (caminho, idioma) -> new ResultadoRenderizacao(null, 502));

    RespostaPaginaPublica resposta = useCase.executar("/projects/aa-space", "pt");

    assertThat(resposta.status()).isEqualTo(502);
    assertThat(resposta.statusCache()).isEqualTo(StatusCache.MISS);
    assertThat(cache.buscar("pt|/projects/aa-space")).isEmpty();
  }

  private ResultadoRenderizacao ok(String html) {
    return new ResultadoRenderizacao(html, 200);
  }

  private RenderizarPaginaPublicaUseCase montar(
      PaginaCachePort cache, boolean bypass, SsrRendererPort renderer) {
    return new RenderizarPaginaPublicaUseCase(
        propriedades(bypass), cache, renderer, Runnable::run);
  }

  private SsrProperties propriedades(boolean bypass) {
    return new SsrProperties(true, bypass,
        new SsrProperties.Renderer("http://127.0.0.1:4000", 5),
        new SsrProperties.Cache(2,
            new SsrProperties.Html(900, 86400, 500),
            new SsrProperties.Data(300, 3600, 500),
            new SsrProperties.Markdown(21600, 200),
            new SsrProperties.Mermaid(86400, 500),
            new SsrProperties.Warmup(true, 20)));
  }

  /** Fake em memória do cache de páginas: o suficiente para exercitar o use case. */
  private static final class FakePaginaCache implements PaginaCachePort {
    private final ConcurrentHashMap<String, PaginaCacheada> mapa = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    @Override
    public Optional<PaginaCacheada> buscar(String chave) {
      return Optional.ofNullable(mapa.get(chave));
    }

    @Override
    public void armazenar(String chave, PaginaCacheada pagina) {
      mapa.put(chave, pagina);
    }

    @Override
    public void invalidar(String chave) {
      mapa.remove(chave);
    }

    @Override
    public void invalidarPorTag(String tag) {
      mapa.values().removeIf(p -> p.tags().contains(tag));
    }

    @Override
    public void limparTudo() {
      mapa.clear();
    }

    @Override
    public long quantidade() {
      return mapa.size();
    }

    @Override
    public boolean tentarObterLock(String chave, int esperaSegundos) {
      try {
        return locks.computeIfAbsent(chave, k -> new ReentrantLock())
            .tryLock(Math.max(0, esperaSegundos), TimeUnit.SECONDS);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return false;
      }
    }

    @Override
    public void liberarLock(String chave) {
      ReentrantLock lock = locks.get(chave);
      if (lock != null && lock.isHeldByCurrentThread()) {
        lock.unlock();
      }
    }
  }
}
