# Deploy Oracle — modo SSR/edge (Fase 7)

> **Status:** preparado, **não migrado**. O deploy atual continua sendo o
> `Dockerfile.oracle-cloud` (API-only, front no Vercel). Os arquivos abaixo
> permitem ligar o modo SSR quando você decidir migrar o serving do front para o
> Oracle — a troca de produção exige sua confirmação explícita.

## O que esta imagem faz

Um único container roda **dois processos**:

| Processo | Porta | Papel |
| --- | --- | --- |
| Spring Boot (edge) | `8080` (público) | cache Caffeine de HTML/markdown, SEO `<head>`, sitemap/robots; em cache-miss chama o renderer |
| Node `@angular/ssr` | `4000` (interno) | renderiza Angular → HTML + hidratação; busca `/api/*` no Spring |
| Chromium (Playwright) | — | Mermaid→SVG e currículo em PDF (reuso) |

Fluxo: `Googlebot → Spring :8080 → (HIT serve da RAM | MISS → Node :4000 → render → cacheia)`.

## Arquivos

- [`../Dockerfile.oracle-ssr`](../Dockerfile.oracle-ssr) — imagem JRE 17 + Node 20 + Chromium; builda Angular (`browser`+`server`) via profile Maven `with-frontend`.
- [`entrypoint-ssr.sh`](entrypoint-ssr.sh) — sobe Node + Spring e derruba o container se qualquer um morrer (tini como PID 1).
- [`docker-compose.ssr.yml`](docker-compose.ssr.yml) — runtime com `SSR_ENABLED=true`, healthcheck dos dois processos, limite de memória maior (1536M).
- [`../.dockerignore`](../.dockerignore) — mantém o build context leve.

## Build

```bash
# Na raiz do repositório
docker build -f Dockerfile.oracle-ssr -t portfolio-wesley-ssr:latest .
```

## Run (com SSR ligado)

```bash
cd oracle-cloud
# .env deve conter os segredos do backend (GitHub token, etc.) — igual ao modo API-only
docker compose -f docker-compose.ssr.yml up -d
```

Ajuste `PUBLIC_SITE_BASE_URL` no `.env`/compose para o **domínio canônico real**
(usado em canonical/hreflang/OG/JSON-LD/sitemap).

## Variáveis relevantes

| Env | Default | Função |
| --- | --- | --- |
| `SSR_ENABLED` | `false` (Docker) / `true` (compose) | liga o edge SSR; `false` = Spring serve o SPA estático |
| `SSR_BYPASS` | `false` | rollback de emergência (volta ao SPA) sem rebuild |
| `SSR_RENDERER_URL` | `http://127.0.0.1:4000` | Spring → Node |
| `SSR_API_BASE_URL` | `http://127.0.0.1:8080` | Node → Spring (API durante o render) |
| `NODE_SSR_PORT` | `4000` | porta do renderer Node |
| `PUBLIC_SITE_BASE_URL` | `https://wmakeouthill.github.io` | domínio canônico |
| `SSR_WARMUP_ENABLED` | `true` | aquece `/`, `/projects`, top projetos no startup |

## Rollback (sem perder o backend)

1. **Sem rebuild:** `SSR_BYPASS=true` (ou `SSR_ENABLED=false`) → recria o container; Spring volta a servir o SPA estático; a API segue intacta.
2. **Voltar à imagem anterior:** suba o `docker-compose.yml` (imagem API-only) e reative o serving do front no Vercel.

## Pendências antes de migrar produção (Fase 8)

- Validar o build da imagem de fato (`docker build`) e subir local com backend + token GitHub.
- `curl` no HTML bruto de `/`, `/projects`, `/projects/{slug}` confirmando conteúdo + `X-Cache: HIT` na 2ª chamada.
- Definir e apontar `PUBLIC_SITE_BASE_URL` para o domínio final; atualizar DNS/Vercel.
- Lighthouse + Search Console pós-migração.
