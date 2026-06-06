# Plano SEO, SSR e Cache em Memória — Portfolio Wesley

> Adaptado do plano bem-sucedido de SEO/SSR/Cache do projeto AutoU (FastAPI + Vite/React)
> para este stack: **Spring Boot 3.x (Java)** como edge/orquestrador/cache e
> **Angular 20 (`@angular/ssr`)** como renderizador, seguindo as
> `regras-desenvolvimento-java-angular` (Clean Architecture, SOLID, DRY, KISS, YAGNI).

---

## Objetivo

Fazer com que as rotas públicas do portfólio sejam **extremamente rápidas** para
usuários e Googlebot, mantendo:

- **Spring Boot** como edge HTTP, orquestrador e **dono do cache em memória**;
- **Angular SSR (`@angular/ssr`)** como renderizador da UI com hidratação;
- **GitHub** (READMEs, imagens) + **i18n JSON** + APIs do portfólio como fontes da verdade.

Resultado esperado: o Googlebot recebe **HTML completo**, com conteúdo e metadados,
em milissegundos quando o cache estiver quente — com performance igual ou superior
a um Next.js, porque o cache-hit responde direto da RAM da JVM, sem render.

## Princípios

- SEO depende do **HTML inicial**, não apenas da API responder rápido.
- Cache em memória no Spring (**Caffeine**) é a primeira escolha por simplicidade e baixa latência.
- GitHub/i18n continuam sendo a fonte da verdade; não chamar fontes externas em cache-hit de HTML.
- Angular continua sendo a UI (mesmos componentes), **sem migrar para Next.js**.
- Imagens **não** devem ser cacheadas como binário na RAM da JVM.
- Cache deve ter **TTL fixo**, **invalidação por SHA/agendamento** e **fallback stale**.
- Mudanças **incrementais e pequenas**, respeitando a arquitetura atual do repo.
- Seguir Clean Architecture: `dominio → aplicacao → infraestrutura/interfaces`.

---

## Estado atual verificado

- **Frontend:** Angular 20.3 standalone, builder `@angular/build:application` (suporta SSR nativo).
  - [`app.routes.ts`](frontend/src/app/app.routes.ts) está **vazio** → SPA de página única (seções na home).
  - READMEs/markdowns abrem em **modais**, renderizados no cliente via `marked` + `mermaid` ([`markdown.service.ts`](frontend/src/app/services/markdown.service.ts)).
  - [`index.html`](frontend/src/index.html) entrega `<app-root></app-root>` vazio → invisível para bots.
- **Backend:** Spring Boot 3.2.3 (Java 17), serve o Angular como **estático** ([`SpaController.java`](backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/web/SpaController.java)).
  - **Não há Spring Cache** (nenhum `@EnableCaching`/Caffeine no [`pom.xml`](backend/pom.xml)).
  - Conteúdo vem de APIs `/api/*` (GitHub com ETag): content, projects, certifications, chat, contact.
  - **Playwright + Chromium já instalados** (usados em [`CurriculoPdfService`](backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/pdf/CurriculoPdfService.java)) → reaproveitar para Mermaid.
- **i18n:** runtime via [`i18n.service.ts`](frontend/src/app/i18n/i18n.service.ts) com `assets/i18n/{en,pt}.json` (não é i18n de compile-time do Angular).
- **Deploy atual:** front no **Vercel**, backend no **Oracle** ([`Dockerfile.oracle-cloud`](Dockerfile.oracle-cloud), runtime `eclipse-temurin:17-jre-jammy`, só Java).
- Não há sitemap, robots, canonical, Open Graph, Twitter cards nem JSON-LD.

---

## Decisões já tomadas (com o usuário)

1. **Motor SSR:** Angular SSR nativo (`@angular/ssr`) em **processo Node sidecar**; o **Spring é o edge** e cacheia o HTML renderizado no **Caffeine**; cache-miss → proxy localhost → Node → guarda → serve.
2. **Markdown:** renderizado no **backend Java** (commonmark-java) + cache por `projeto+idioma+sha`. **Mermaid → SVG via Playwright já existente** (sem dependência nova).
3. **Rotas/SEO:** criar URLs reais (`/projects/:slug`) + prefixos `/en` `/pt`; meta/OG/JSON-LD por rota, hreflang, canonical, sitemap.xml + robots.txt.
4. **Deploy:** o serving do front **migra do Vercel para o Oracle** (Spring edge + Node SSR na mesma imagem Docker). Vercel pode virar CDN puro na frente (fase opcional).

---

## Impacto do deploy (Vercel + Oracle)

Para o Spring **segurar o HTML em cache e servir a primeira resposta**, ele precisa
estar na frente. Hoje o Vercel serve o front; isso muda:

- O **serving do front migra para o Oracle**: Spring (edge, 8080) + Node SSR (interno, 4000) na **mesma imagem**.
- O **Vercel não precisa morrer** — vira (fase opcional) **CDN puro** com rewrite para o origin Oracle, somando cache de borda global ao Caffeine.
- **Descartado:** deixar SSR no Vercel e Oracle só API — o cache do HTML ficaria na borda do Vercel, não no Spring Cache (contradiz o pedido).

---

## Arquitetura alvo

```text
Usuário / Googlebot
        |
        v   (Vercel CDN opcional na frente — fase 7)
+-------------------------------------------------------------+
|  Container Oracle                                           |
|                                                            |
|  Spring Boot (8080, edge)                                  |
|   +-- /assets/*, /*.{js,css,png,...}  -> estático + cache HTTP longo
|   +-- /api/*                          -> APIs JSON (data cache)
|   +-- /, /projects/:slug, /en, /pt    -> Public Page Service (SSR cache)
|   |        |                                               |
|   |        +-- HTML cache em memória (Caffeine)            |
|   |        +-- markdownHtml / mermaidSvg cache (Caffeine)  |
|   |        +-- Angular SSR Renderer apenas no MISS         |
|   +-- /sitemap.xml, /robots.txt        -> cacheados        |
|                                                            |
|  Node @angular/ssr (4000, interno)                         |
|   +-- renderiza Angular para string + hidratação           |
|       +-- busca /api/* no próprio Spring (TransferState)    |
+-------------------------------------------------------------+
```

### Responsabilidades

**Spring Boot (aplicacao + infraestrutura):**

- decide se a rota pública pode ser servida do cache;
- busca conteúdo (GitHub/i18n) quando necessário;
- chama o renderizador SSR (Node) **somente em cache-miss**;
- monta/injeta o `<head>` SEO final;
- invalida cache quando o SHA do GitHub muda ou por agendamento;
- serve **stale** se Node/GitHub falhar.

**Angular (SSR):**

- renderiza a UI pública para string no servidor e **hidrata** no cliente;
- reusa os componentes atuais;
- **evita** acesso direto a `window`, `document`, `localStorage`, `IntersectionObserver`, `DOMParser` durante o SSR.

**GitHub / i18n:**

- fontes da verdade; **não** são chamadas em cache-hit de HTML.

---

## Rotas que precisam de HTML inicial completo

| Rota | Estratégia alvo | Motivo |
| --- | --- | --- |
| `/` (e `/en`, `/pt`) | SSR cacheado | Home com keywords principais; muda pouco |
| `/projects` (e por idioma) | SSR cacheado | Lista rastreável com links para projetos |
| `/projects/:slug` | SSR cacheado | Página principal de indexação de cada projeto (README) |
| `/api/*` | API JSON | Não é página de SEO (recebe data cache) |
| `/assets/*`, `*.{js,css,png}` | Estático | Cache HTTP longo, hashed = `immutable` |
| `/sitemap.xml`, `/robots.txt` | Gerado + cacheado | Crawl |

---

## Camadas de cache (Spring Cache + Caffeine)

> Base: `spring-boot-starter-cache` + `com.github.ben-manes.caffeine:caffeine`,
> `@EnableCaching`, `CacheManager` Caffeine configurado em `infraestrutura/config`.
>
> Para **HTML de página** (que precisa de **stale-while-revalidate** e **single-flight**),
> NÃO usar `@Cacheable` direto — usar um `PublicPageCacheService` que envolve um
> `Cache` Caffeine, guardando metadados (TTL/stale/etag) junto do valor. Mesma decisão
> que o AutoU tomou ("não usar decorator direto quando precisa de stale/single-flight").
> Para **data caches** simples (markdown, github), `@Cacheable` é suficiente.

### 1. HTML cache (`ssrPages`) — o mais importante para SEO

Conteúdo por chave: HTML final, status, headers principais, `etag`, timestamps, stale deadline, tags.

Chaves: `html:/`, `html:/en`, `html:/pt`, `html:/projects`, `html:/projects/{slug}`, `html:/{lang}/projects/{slug}`.

TTL sugerido: `ssr.cache.html.ttl-seconds=900` · `ssr.cache.html.stale-seconds=86400`.

### 2. Markdown cache (`markdownHtml`)

Markdown do GitHub já renderizado para HTML (commonmark) + Mermaid em SVG já embutido.

Chaves: `md:{slug}:{lang}:{sha}` (o SHA invalida sozinho quando o README muda).

TTL: `ssr.cache.markdown.ttl-seconds=21600` (6h) — protegido pela chave com SHA.

### 3. Mermaid SVG cache (`mermaidSvg`)

SVG renderizado via Playwright a partir do código mermaid.

Chaves: `mermaid:{sha256(code)}`. TTL longo (`ssr.cache.mermaid.ttl-seconds=86400`).

### 4. GitHub data cache (`githubData`)

DTOs públicos (lista de projetos, imagens-metadados, certificações).

Chaves: `data:projects:list:{lang}`, `data:images:list`, `data:certifications:{lang}`.

TTL: `ssr.cache.data.ttl-seconds=300` · stale `3600`.

> **Imagens:** cachear **apenas metadados** (URL, alt, width/height, mime, size, sha).
> Binário de imagem **nunca** vai para a RAM — servir como estático com
> `Cache-Control: public, max-age=31536000, immutable` (nomes hashed).

---

## Política de resposta

### Cache hit fresco

```text
1. GET /projects/aa-space
2. Encontra html:/projects/aa-space válido
3. Responde HTML direto da memória  ->  X-Cache: HIT
Meta TTFB local/app: 1ms a 20ms
```

### Cache miss

```text
1. GET /projects/aa-space
2. HTML cache inexistente/expirado
3. Adquire lock por chave (single-flight)
4. Busca DTO no data cache ou GitHub; markdown -> markdownHtml/mermaidSvg
5. Chama Angular SSR Renderer (Node)
6. Injeta <head> SEO final
7. Salva HTML em memória  ->  X-Cache: MISS
```

### Cache expirado com stale disponível

```text
1. HTML expirou mas dentro da stale window
2. Responde stale imediatamente  ->  X-Cache: STALE
3. Dispara refresh em background
```

### Erro de GitHub ou renderizador

```text
Prioridade: 1) HTML fresco  2) HTML stale  3) shell mínima indexável  4) 500 só em último caso
```

### Single-flight por chave

`lock:html:/projects/aa-space` — só uma thread gera; as outras aguardam
`ssr.cache.lock-wait-seconds=2` e então recebem stale (se houver). Evita N renders simultâneos do mesmo projeto.

---

## Invalidação

Sem CMS — a fonte é o GitHub. Estratégia:

| Evento | Data cache | HTML cache |
| --- | --- | --- |
| SHA do README muda (detectado no fetch) | `data:projects:list:*`, `md:{slug}:*` | `/`, `/projects`, `/projects/{slug}`, `sitemap.xml` |
| Nova imagem/SHA muda | `data:images:list` | `/`, `/projects` |
| Refresh agendado (`@Scheduled`) | revalida listas | warmup das rotas pinadas |
| Deploy | limpa tudo + warmup | limpa tudo + warmup |

- A chave de `markdownHtml` **inclui o SHA**, então conteúdo novo gera chave nova automaticamente (sem invalidação explícita).
- Um `@Scheduled` (ex.: a cada 10 min) compara SHAs do GitHub e dispara warmup das rotas afetadas. Tags sugeridas: `home`, `projects`, `project:{slug}`, `sitemap`.

---

## Warmup de cache

### No startup (`ApplicationRunner`)

1. aquecer `/`, `/en`, `/pt`;
2. aquecer `/projects` (por idioma);
3. aquecer top N projetos (`ssr.cache.warmup.top-projects=20`);
4. gerar `sitemap.xml` / `robots.txt` em cache.

→ **primeira requisição já é cache-hit** (zero penalidade de cold-start no SEO).

### Após detectar mudança de SHA

1. invalidar chaves afetadas;
2. disparar warmup das rotas afetadas em background;
3. logar sucesso/falha.

---

## SEO `<head>` obrigatório

Toda rota pública recebe: `<title>`, `<meta name="description">`, canonical,
Open Graph, Twitter Card, `robots` index/follow, **hreflang** (`en`↔`pt`), JSON-LD.

- **Home:** JSON-LD `Person` (portfólio do Wesley) + `WebSite`.
- **Projeto (`/projects/:slug`):** JSON-LD `SoftwareSourceCode`/`CreativeWork` + `BreadcrumbList`
  (name, description, image, author, programmingLanguage, codeRepository, dateModified).

Implementar via `Title`/`Meta` services do Angular no SSR **e/ou** injeção final do `<head>`
no Spring (`seoHeadBuilder`), garantindo que o HTML cacheado já saia com tudo.

---

## Sitemap e robots

```text
GET /sitemap.xml   ->  /, /projects, cada /projects/{slug}, variações /en /pt (hreflang)
GET /robots.txt    ->  Allow: / ; Disallow: /api/ ; Sitemap: https://dominio/sitemap.xml
```

Headers: `Content-Type: application/xml`, `Cache-Control: public, max-age=300, stale-while-revalidate=86400`. Ambos cacheados em memória.

---

## Semântica HTML e conteúdo (checklist por página)

- [ ] exatamente um `<h1>` por página pública;
- [ ] seções principais em `<section>`; conteúdo de projeto em `<article>`;
- [ ] links internos com `<a href>` real (não só `(click)`);
- [ ] imagens informativas com `alt` descritivo; decorativas com `alt=""` + `aria-hidden`;
- [ ] `width`/`height` em imagens principais; `loading="lazy"` só abaixo do fold;
- [ ] imagem LCP acima do fold **sem** lazy;
- [ ] conteúdo **não** fica invisível se o JS falhar (ver `Reveal` abaixo);
- [ ] markdown/HTML **sanitizado** antes de renderizar.

---

## Ajustes específicos encontrados (SSR-safety)

### `app.ts` — APIs de browser no ciclo de vida

[`app.ts`](frontend/src/app/app.ts) usa `window`, `IntersectionObserver`, `MutationObserver`, `document`
direto em `ngOnInit`/`ngAfterViewInit`. **Plano:** mover para `afterNextRender()` ou guardar com
`isPlatformBrowser(inject(PLATFORM_ID))`. No SSR, esse código simplesmente não roda.

### `Reveal` — conteúdo começa com `opacity: 0`

As classes `.reveal` iniciam invisíveis até o JS adicionar `.in`. **Plano:** garantir que o
conteúdo SSR fique visível sem JS — aplicar a animação só após hidratação (classe no `<html>`
adicionada via script no cliente) ou `noscript` que neutraliza o `opacity:0`. Sem isso o Googlebot
pode ver conteúdo "vazio".

### Markdown / Mermaid / Prism

[`markdown.service.ts`](frontend/src/app/services/markdown.service.ts) usa `marked` (ok no server)
+ `mermaid` (precisa de DOM → quebra no SSR). **Plano:** mover render de markdown para o **backend**
(commonmark + Mermaid via Playwright → SVG no HTML). O texto/diagrama fica no source-code; no cliente
o Prism só faz highlight após hidratação. Manter o texto do code block indexável.

### Serviços com `localStorage`

[`portfolio-content.service.ts`](frontend/src/app/services/portfolio-content.service.ts),
[`markdown.service.ts`](frontend/src/app/services/markdown.service.ts), `chat-storage.util.ts`
acessam `localStorage` no construtor/métodos. **Plano:** guardar com `isPlatformBrowser`;
no SSR, pular o snapshot local.

### Browser-only: `pdfjs-dist`, `lottie-web`, `@emailjs/browser`

Componentes [`pdf-viewer`](frontend/src/app/components/pdf-viewer/pdf-viewer.component.ts),
[`mermaid-diagram`](frontend/src/app/components/mermaid-diagram/mermaid-diagram.component.ts),
[`chat-widget`](frontend/src/app/components/chat-widget/chat-widget.component.ts) e o
[`email.service.ts`](frontend/src/app/services/email.service.ts). **Plano:** `@defer` / `afterNextRender`
/ import dinâmico guardado — só executam no cliente.

### i18n runtime

[`i18n.service.ts`](frontend/src/app/i18n/i18n.service.ts) resolve idioma (hoje provavelmente via
`localStorage`/navegador). **Plano:** no SSR, resolver idioma pela **rota** (`/en` `/pt`) ou header
`Accept-Language`, nunca por `localStorage`. Passar o idioma como estado de servidor para evitar mismatch.

### Hidratação + TransferState

Adicionar `provideClientHydration(withHttpTransferCache())` em [`app.config.ts`](frontend/src/app/app.config.ts)
→ dados buscados no SSR são serializados no HTML e reaproveitados no cliente (sem refetch, sem flicker).

---

## Configurações propostas (`application.properties`)

```properties
# Edge / SSR
ssr.enabled=true
ssr.renderer.url=http://127.0.0.1:4000/render
ssr.renderer.timeout-seconds=5
public.site.base-url=https://www.SEU-DOMINIO.com.br

# HTML cache
ssr.cache.html.ttl-seconds=900
ssr.cache.html.stale-seconds=86400
ssr.cache.html.max-entries=500
ssr.cache.lock-wait-seconds=2

# Data / markdown / mermaid cache
ssr.cache.data.ttl-seconds=300
ssr.cache.data.stale-seconds=3600
ssr.cache.markdown.ttl-seconds=21600
ssr.cache.mermaid.ttl-seconds=86400

# Warmup
ssr.cache.warmup.enabled=true
ssr.cache.warmup.top-projects=20

# Toggle de rollback
ssr.bypass=false
```

Mesmas chaves no [`application-example.properties`](backend/src/main/resources/application-example.properties).

---

## Estrutura backend proposta (Clean Architecture, seguindo as regras)

> Pacote base: `com.wmakeouthill.portfolio`. Classes ≤300 linhas, métodos ≤20,
> `@RequiredArgsConstructor`, `Optional` em vez de `null`, sem singleton manual.

```text
com.wmakeouthill.portfolio
  dominio/
    seo/                 ParametrosSeo (value object imutável), CanonicalUrl
  aplicacao/
    pagina/
      RenderizarPaginaPublicaUseCase     # orquestra: cache -> data -> SSR -> head -> cache
      InvalidarCachePublicoUseCase
      AquecerCacheUseCase                 # warmup startup/scheduled
    markdown/
      RenderizarMarkdownUseCase          # commonmark + mermaid (port)
    seo/
      ConstruirMetadadosSeoUseCase
      GerarSitemapUseCase
    port/
      RenderizadorSsrPort                 # contrato do Node SSR
      RenderizadorMermaidPort             # contrato do Playwright
      CachePaginaPort
  infraestrutura/
    cache/
      CaffeineCacheConfig                 # @EnableCaching + CacheManager
      CachePaginaCaffeineAdapter          # stale + single-flight + tags
    rendering/
      NodeSsrRendererAdapter              # HTTP localhost:4000 (RenderizadorSsrPort)
      PlaywrightMermaidAdapter            # reusa Chromium (RenderizadorMermaidPort)
    markdown/
      CommonmarkRenderizadorAdapter
    seo/
      SeoHeadBuilder
    web/
      PublicPageController                # /, /projects, /projects/{slug}, /en, /pt
      SitemapController                   # /sitemap.xml, /robots.txt
      (SpaController evolui p/ fallback de assets)
```

Notas pragmáticas (KISS/YAGNI): começar com classes pequenas e diretas; sem Redis
neste ciclo (instância única). Se escalar para múltiplos containers, trocar o
`CachePaginaPort` por implementação Redis sem mudar os use cases.

Dependências novas no [`pom.xml`](backend/pom.xml):

- `org.springframework.boot:spring-boot-starter-cache`
- `com.github.ben-manes.caffeine:caffeine`
- `org.commonmark:commonmark` (+ `commonmark-ext-gfm-tables`, `commonmark-ext-autolink`)

---

## Estrutura frontend proposta

```text
frontend/
  src/
    main.ts            # client bootstrap (hidratação)
    main.server.ts     # bootstrap server (gerado pelo ng add)
    server.ts          # express SSR -> expõe /render (gerado/ajustado)
    app/
      app.config.ts          # + provideClientHydration(withHttpTransferCache())
      app.config.server.ts   # providers de servidor (gerado)
      app.routes.ts          # rotas reais: '', 'projects', 'projects/:slug', '/en', '/pt'
      pages/
        home/                 # container da home (seções atuais)
        projects/             # lista
        project-detail/       # detalhe do README (consome HTML do backend)
      shared/seo/
        seo-metadata.ts       # Title/Meta/JSON-LD por rota
```

Mudanças esperadas:

- `ng add @angular/ssr` configura `server`/`prerender`/`ssr` no [`angular.json`](frontend/angular.json);
- componentes públicos aceitam **estado de servidor** (TransferState) para evitar fetch duplicado;
- código browser-only protegido (ver "Ajustes específicos");
- Angular moderno: `inject()`, `signal()`, `@if/@for/@defer`, standalone, OnPush (já em uso).

---

## Deploy (Oracle: 1 imagem com Node + JRE + Chromium)

Ajustar [`Dockerfile.oracle-cloud`](Dockerfile.oracle-cloud):

- estágio de build já instala Node via `frontend-maven-plugin`; gerar `dist/portfolio/{browser,server}`;
- runtime hoje é `eclipse-temurin:17-jre-jammy` (só Java) → **adicionar Node 20** e copiar o bundle `server`;
- subir **Node SSR (4000)** + **Spring (8080)** no mesmo container (Spring sobe o Node como processo filho ou via `tini`/supervisor simples); healthcheck cobre o renderer;
- Chromium do Playwright já está presente (reuso para Mermaid).
- Frontend deixa de publicar no Vercel; (opcional, fase 7) Vercel vira CDN com rewrite para o origin Oracle.

---

## Observabilidade

Headers públicos: `X-Cache: HIT|MISS|STALE|BYPASS`, `X-Cache-Key: html:/projects/...`, `X-Render-Time-Ms: 12`.

Logs: hit/miss/stale por rota, refresh em background, erro de render, erro de GitHub, invalidações por SHA, warmup.

Métricas: taxa de hit, tempo médio de render SSR, nº de stale, falhas do renderer, TTFB p95 por rota.

---

## Segurança

- Nunca cachear resposta autenticada (chat/contact que dependam de sessão).
- Nunca incluir token/cookie em HTML público.
- **Sanitizar** Markdown/HTML renderizado (commonmark + allowlist).
- Validar que apenas projetos válidos entram no sitemap.
- Rollback: flag `ssr.bypass=true` → volta a servir o SPA estático atual; API segue independente.

---

## Critérios de aceite

### SEO

- [ ] `curl /` contém o texto principal da home no HTML bruto.
- [ ] `curl /projects` contém cards e links para projetos.
- [ ] `curl /projects/{slug}` contém `<h1>`, corpo do README e metatags do projeto.
- [ ] `/sitemap.xml` lista apenas rotas públicas válidas (com hreflang).
- [ ] `/robots.txt` bloqueia `/api/` e aponta o sitemap.
- [ ] Google Search Console inspeciona a URL com HTML completo.
- [ ] Lighthouse SEO = 100.

### Performance

- [ ] HTML cache-hit responde sem chamar GitHub nem o renderer Node.
- [ ] `X-Cache: HIT` aparece após a primeira chamada.
- [ ] cache-miss gera HTML e aquece a chave.
- [ ] stale responde quando o renderer falha.
- [ ] single-flight evita múltiplos renders simultâneos da mesma rota.
- [ ] Core Web Vitals verdes (LCP/CLS/INP).

### Invalidação

- [ ] mudança de SHA do README invalida lista, detalhe e sitemap.
- [ ] warmup recompõe as rotas pinadas após invalidação.

### Imagens

- [ ] imagens informativas usam `alt` descritivo; binário não vai para a RAM.
- [ ] assets hashed com `Cache-Control: immutable`.

---

## Backlog de implementação

### Fase 0 — Alinhamento e base

- [ ] Confirmar domínio canônico público (`public.site.base-url`).
- [x] Definir valores iniciais de TTL.
- [x] Definir que o SSR roda como sidecar Node embutido no container.
- [x] Documentar rollback (`ssr.bypass`).
- [ ] Adicionar variáveis em `application-example.properties`.

Validação:

- [ ] app continua subindo sem SSR habilitado (`ssr.enabled=false`).

### Fase 1 — Cache em memória no backend (Spring Cache + Caffeine)

- [ ] Adicionar dependências (`starter-cache`, `caffeine`) e `@EnableCaching`.
- [ ] `CaffeineCacheConfig` com caches `ssrPages`, `markdownHtml`, `mermaidSvg`, `githubData`.
- [ ] `CachePaginaCaffeineAdapter` com TTL, stale deadline e tags.
- [ ] Single-flight por chave (lock por chave).
- [ ] Headers `X-Cache`.
- [ ] Testes unitários (AAA) para hit/miss/stale/invalidation.

Validação:

- [ ] testes de cache passam; nenhum endpoint autenticado usa cache público.

### Fase 2 — Data cache para conteúdo público

- [ ] Envolver listagem de projetos com `@Cacheable` (`githubData`).
- [ ] Cachear metadados de imagens e certificações.
- [ ] Renderizar markdown no backend (`CommonmarkRenderizadorAdapter`) com cache `md:{slug}:{lang}:{sha}`.
- [ ] Mermaid → SVG via `PlaywrightMermaidAdapter` com cache `mermaid:{hash}`.
- [ ] Invalidação por SHA + `@Scheduled` de revalidação.

Validação:

- [ ] `/api/projects/{slug}/markdown` devolve HTML pronto com `X-Cache`.
- [ ] segunda chamada não bate no GitHub.

### Fase 3 — SEO metadata, sitemap e robots

- [ ] `ConstruirMetadadosSeoUseCase` (title/description/canonical/OG/Twitter/hreflang).
- [ ] `SeoHeadBuilder` injeta `<head>` final.
- [ ] JSON-LD de home (`Person`/`WebSite`) e de projeto (`SoftwareSourceCode`/`BreadcrumbList`).
- [ ] `/sitemap.xml` e `/robots.txt` cacheados.

Validação:

- [ ] XML válido; `/api/*` não aparece no sitemap; metadados corretos por rota.

### Fase 4 — Angular SSR renderer

- [ ] `ng add @angular/ssr`; ajustar [`angular.json`](frontend/angular.json).
- [ ] `provideClientHydration(withHttpTransferCache())` em [`app.config.ts`](frontend/src/app/app.config.ts).
- [ ] Criar rotas reais (`''`, `projects`, `projects/:slug`, `/en`, `/pt`).
- [ ] Proteger `app.ts` (window/IntersectionObserver/MutationObserver) com `afterNextRender`/`isPlatformBrowser`.
- [ ] Proteger serviços com `localStorage`.
- [ ] Tornar Mermaid/Prism/pdfjs/lottie/emailjs client-only (`@defer`/`afterNextRender`).
- [ ] Ajustar `Reveal` para conteúdo visível sem JS.
- [ ] Resolver i18n por rota/header no SSR (sem `localStorage`).
- [ ] Expor `/render` no `server.ts` para o Spring consumir.

Validação:

- [ ] SSR renderiza home, lista e um projeto real;
- [ ] hidratação sem erro/mismatch no console.

### Fase 5 — HTML cache no Spring (edge)

- [ ] `RenderizarPaginaPublicaUseCase` (cache → data → SSR → head → cache).
- [ ] `NodeSsrRendererAdapter` (HTTP localhost:4000, timeout, fallback).
- [ ] `PublicPageController` para `/`, `/projects`, `/projects/{slug}`, `/en`, `/pt`.
- [ ] Servir stale em erro; refresh em background quando stale.
- [ ] `AquecerCacheUseCase` no startup (`ApplicationRunner`) e pós-invalidação.
- [ ] Flag `ssr.bypass` para rollback.
- [ ] `SpaController` evolui para fallback de assets/estáticos.

Validação:

- [ ] `curl /projects/{slug}` mostra HTML completo;
- [ ] segunda chamada `X-Cache: HIT`;
- [ ] desligar o renderer ainda responde stale.

### Fase 6 — Semântica e imagens

- [ ] Um `<h1>` por página; `<section>`/`<article>` corretos.
- [ ] `alt` descritivo nas imagens informativas; `alt=""`+`aria-hidden` nas decorativas.
- [ ] `width`/`height` e `loading="lazy"` (só abaixo do fold); LCP sem lazy.
- [ ] Links internos com `<a href>` real.
- [ ] Markdown sanitizado.

Validação:

- [ ] Lighthouse SEO/A11y sem alertas óbvios;
- [ ] conteúdo visível com JS desabilitado.

### Fase 7 — Deploy / proxy

- [ ] Dockerfile Oracle com Node 20 + bundle `server` + Spring + Chromium.
- [ ] Spring supervisiona o Node SSR; healthcheck cobre o renderer.
- [ ] Migrar serving do front do Vercel para o Oracle.
- [ ] Headers de cache por tipo de rota (assets `immutable`).
- [ ] (Opcional) Vercel como CDN na frente do Oracle.

Validação:

- [ ] domínio público abre home/projeto via SSR;
- [ ] rollback (`ssr.bypass`) testado.

### Fase 8 — Testes e medição

- [ ] Testes unitários de cache (hit/miss/stale/single-flight).
- [ ] Testes de invalidação por SHA.
- [ ] Testes de sitemap/robots.
- [ ] Teste SSR de home/lista/projeto.
- [ ] Validação HTTP do HTML bruto (`curl`).
- [ ] Lighthouse antes/depois.
- [ ] Validação no Google Search Console após deploy.

Validação:

- [ ] p95 local de HTML cache-hit dentro da meta (1–20ms);
- [ ] conteúdo indexável aparece no HTML bruto.

---

## Ordem recomendada

1. Cache em memória genérico e testado (Caffeine + adapter stale/single-flight).
2. Data cache + markdown no backend (commonmark + mermaid via Playwright).
3. Sitemap, robots e metadata builder.
4. SSR Angular para uma rota piloto (`/projects/:slug`).
5. HTML cache + stale recovery na rota piloto.
6. Expandir para `/`, `/projects`, `/en`, `/pt`.
7. Semântica/alt/Reveal.
8. Deploy Oracle (Node embutido) + rollback.
9. Medições de SEO/performance (Lighthouse, Search Console).

Essa ordem reduz risco: melhora a base de cache primeiro, prova o SSR numa rota de
alto valor e só depois expande para o site inteiro.

---

## Trade-off

Cache em memória (Caffeine) é o caminho mais rápido e simples para **uma instância**.
Se o deploy escalar para múltiplos containers, cada instância terá o próprio cache;
nesse momento, Redis vira a evolução natural para cache compartilhado, **sem mudar o
contrato dos use cases** (`CachePaginaPort`). Mantém-se KISS/YAGNI agora.
