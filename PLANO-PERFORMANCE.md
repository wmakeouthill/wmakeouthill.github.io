# Plano de Performance — wmakeouthill.dev

Otimização do PageSpeed/Lighthouse **sem perder nenhuma feature**. Baseado no
relatório desktop de 06/jun/2026 (`pagespeed.web.dev/.../f8w6x28hmu`).

## Baseline (antes)

| Métrica | Valor |
|---|---|
| Performance | **45** 🔴 |
| Acessibilidade | 98 |
| Práticas | 100 |
| SEO | 85 |
| LCP | 2,1 s |
| FCP | 1,7 s |
| **TBT** | **1.130 ms** 🔴 |
| CLS | 0 |
| Speed Index | 5,6 s |

**Causas-raiz mapeadas no código:**
1. `mermaid@10.6.1` (821 KiB) render-blocking no `<head>` — **morto** (app usa mermaid npm v11 lazy).
2. Prism (CSS + 2 JS) render-blocking de CDN — só usado após interação.
3. Imagens grandes não otimizadas (LCP = `wesley-photo.png`).
4. Preload em background de TODOS os READMEs/galerias → TBT + Speed Index.

---

## Fases

### ✅ Fase 1 — Remover mermaid CDN morto do `<head>`
> Ganho: ~821 KiB + ~1.120 ms de render-blocking. Risco: baixo.

**Backlog**
- [x] Confirmar que nenhum código do frontend usa `window.mermaid` (só o backend usa, em HTML próprio).
- [x] Remover `<script src="...mermaid@10.6.1...">` de `frontend/src/index.html`.
- [x] Build de produção passa sem erro.
- [ ] Regressão (pós-deploy): diagramas mermaid ainda renderizam no modal de README e no chat.

### ✅ Fase 2 — Migrar Prism para npm lazy (tirar 3 do `<head>`)
> Ganho: remove 3 round-trips críticos a 2 origens terceiras. Risco: baixo.
> Caminho escolhido: `prismjs` já é dependência npm — importar lazy só onde o
> highlight roda; tema okaidia vai pro bundle global (same-origin, ~1,5 KiB).

**Backlog**
- [x] Confirmar consumidores de `window.Prism`: `use-syntax-highlighting.ts` (chat) e `readme-modal.component.ts`.
- [x] Confirmar gramáticas usadas: java, typescript, javascript, bash, json, css, markup, python, sql.
- [x] Criar `utils/prism-loader.util.ts` com `ensurePrism()` (import dinâmico de core + gramáticas, `manual: true`, seta `window.Prism`).
- [x] Tema okaidia: adicionar `node_modules/prismjs/themes/prism-okaidia.css` aos `styles` do `angular.json`.
- [x] Atualizar `use-syntax-highlighting.ts` para `await ensurePrism()` antes de destacar.
- [x] Atualizar `readme-modal.component.ts` (`setupCodeBlocks`) para `await ensurePrism()`.
- [x] Remover `<link prism-okaidia.css>` + os 2 `<script>` do Prism de `index.html`.
- [x] Build passa (Prism agora em lazy chunks). Regressão pós-deploy: highlight no chat e no modal (java/ts/js/json/bash/sql/css).

### ✅ Fase 3 — Otimizar imagens do LCP e avatar
> Ganho real: **688 KiB → 34 KiB**. LCP de 207 KiB → 13 KiB. Risco: baixo.
> Ferramenta: `sharp` (devDependency) + `scripts/optimize-images.mjs`.

**Backlog**
- [x] `wesley-photo.png` (207 KiB, LCP): WebP redimensionado → **13,0 KiB (-94%)**.
- [x] `ai-avatar.png` (257 KiB, exibido 58×66): WebP 128px → **10,5 KiB (-96%)** (2 cópias: raiz + assets).
- [x] Atualizar `src` para `.webp` em hero, chat-header e chat-floating-button. `fetchpriority="high"` mantido no LCP.
- [x] OG image (`seo.service.ts`) mantida em PNG (compat. com scrapers sociais). PNGs preservados no disco.
- [x] Build passa. Regressão visual pós-deploy: foto do hero e avatar do chat.

### ✅ Fase 4 — Adiar preload de READMEs (ataca o TBT)
> Ganho: tira o preload da janela crítica → reduz TBT/Speed Index. Risco: baixo
> (feature preservada — cache ainda é populado, modal abre instantâneo).

**Backlog**
- [x] Trocar `setTimeout(500)` por `requestIdleCallback` (com `timeout: 3000` e fallback `setTimeout`) em `projects.component.ts`.
- [x] Mantido o `delay(100)` entre projetos em `markdown.service.ts` (concorrência já throttled).
- [x] Build passa. Regressão pós-deploy: abrir README não pré-carregado ainda funciona (com loading).

### ✅ Fase 5 — Imagens de projeto (repo de conteúdo) + octocat
> Octocat feito. Imagens de projeto vêm do repo de conteúdo `certificados-wesley`
> (backend faz proxy do GitHub raw). Pipeline já suportava WebP de ponta a ponta
> (`isImage()`/`detectMediaType` aceitam webp; cache do front usa o nome real do
> arquivo via `findBestImageUrl`). Bastou converter os arquivos no repo de conteúdo.

**Backlog**
- [x] `assets/octocat.mp4` (440 KiB): `preload="auto"` → `preload="metadata"` (sai da janela crítica; play-once preservado).
- [x] Converter `portifolio_imgs/*.{png,jpg}` → `.webp` no repo `certificados-wesley` (28 arquivos, **1.744 KiB → 394 KiB, -77%**). Box 800×500 (= ~2,5× o card real, `object-fit: contain`), q80. Maiores: `gerador-de-cracha` 529→**18,7 KiB**, `desafio_tecnico_jitterbit` 484→**13,5 KiB**. 2 minúsculos mantêm PNG (webp não compensou). Script: `frontend/scripts/optimize-content-images.mjs` (sharp).
- [x] Fallback morto `getProjectImageUrl` (`.png` hardcoded) → `.webp` por consistência (cards reais usam `findBestImageUrl`/cache, que já resolve a extensão real).
- [x] Commit + push do repo `certificados-wesley` (`b918543`) → reflete em produção (cache backend 1h).
- [ ] (Backlog) Reduzir tamanho dos thumbnails de PDF gerados (300–600 KiB cada): ajuste no backend/geração.

### ✅ Fase 5b — Limpeza de assets sobrando no frontend
> ~9,6 MB de arquivos sem nenhuma referência no código. **Não afetavam o
> PageSpeed** (o browser só baixa o referenciado), mas inchavam repo e deploy.

**Backlog**
- [x] Mover p/ backup (raiz `_assets-backup/`, fora do `frontend/` → não vai pro deploy): `nebula.{gif,json,mov}` (~6,1 MB), `octocat.json` (2,27 MB), `octocat.mp4` (raiz, duplicata), `ai-avatar.png` (×2), `wesley-photo.png` (raiz), `new_conversation.png`, `prototype-favicon.png`.
- [x] Remover dep morta `lottie-web` do `package.json` (não importada em lugar nenhum). Lock sincronizado, build passa.
- [x] Mantidos (usados): `favicon.png`, `*.webp` (avatar/foto), `assets/wesley-photo.png` (OG), `assets/octocat.mp4`, `assets/pdf.worker.min.mjs`, `icons/`.
- [x] **Reencode `octocat.mp4`**: era 1280×720/8s/449 KiB; exibido só num quadrado ~140px (`width:35%` do anel, `object-fit: cover`, redondo). Recortado pro quadrado central + escala 320×320, h264 CRF32, sem áudio → **58 KiB (-87%)**. Visualmente idêntico. Original em `_assets-backup/.../octocat.original-1280x720.mp4`.
- [x] **Avatar do chat (`ai-avatar.webp`)**: bolha exibe 62px / header 40px (`object-fit: cover`). Regerado **160×160 quadrado** (≈2,6× retina) a partir da original 400×457 → 10,5→13,5 KiB (+3 KiB, ganho de nitidez em telas 3×).
- [x] **OG image**: `wesley-photo.png` 571×1000 (212 KiB) → **`wesley-photo.jpg` mozjpeg q85 (26,4 KiB, -87%)**. `seo.service.ts` `OG_IMAGE` → `.jpg`. Não está na rota crítica (só scrapers sociais); PNG antigo no backup.
- [x] **`wesley-photo.webp` (LCP)**: verificada — original nativa é 571×1000 (já no máx da fonte); 13 KiB. Nada a otimizar sem foto de maior resolução.

### ✅ Fase 6 — PDF nativo-primeiro + thumbnails JPEG
> Os modais de **certificado** e **currículo** usavam pdf.js (worker 1,4 MB +
> chunk 377 kB + parse na main-thread + download do PDF inteiro). Render lento,
> não-instantâneo. Solução: renderizar com o viewer **nativo do navegador**
> (PDFium via `<iframe>`) quando há suporte inline, mantendo pdf.js só como
> fallback lazy. Como o viewer de PDF é client-only + lazy, **zero impacto no
> SEO/bot** (a página SSR não o carrega). Risco: baixo.

**Backlog**
- [x] Detecção padrão `navigator.pdfViewerEnabled` → `<iframe>` nativo (`#toolbar=1&navpanes=0&view=FitH`, `DomSanitizer.bypassSecurityTrustResourceUrl`). Desktop (Chrome/Edge/Firefox) renderiza **na hora**, sem baixar pdf.js (~1,8 MB economizados).
- [x] Fallback pdf.js lazy preservado p/ mobile / navegadores sem viewer inline. Controles custom de zoom/rotação ocultos no modo nativo (o viewer nativo tem os dele).
- [x] Aplicado nos **dois** componentes: `certifications.component` (certificados) e `cv-modal.component` (currículo). `cv-modal` ganhou guarda de SSR (`PLATFORM_ID`).
- [x] Backend já serve o PDF com `Content-Disposition: inline` + `application/pdf` (pré-requisito do iframe nativo) e cache 1 h.
- [x] **Thumbnails PNG → JPEG q0.82** (`PdfThumbnailService` via `ImageWriteParam`; `ImageType.RGB` é alpha-free → JPEG-safe). Nativo do JDK, **container-safe** (sem lib nativa, ao contrário de WebP — que quebraria no Dockerfile Alpine). Content-type do controller → `IMAGE_JPEG`. Esperado ~−75% vs PNG nos cards.
- [x] **Cache quente**: `ThumbnailPreloadService` (`@PostConstruct` + `@Async`) já baixa o PDF e gera a thumbnail de **todos** os certificados + currículo no startup, cacheando `putPdf` + `putThumbnail` (TTL 24 h). Primeira abertura já vem quente.
- [x] Build frontend OK (chunk `pdf` continua lazy, 377 kB) + compile backend OK.

### ⬜ Fase 7 — Nit de canonical (SEO 85 → ~92)
> Ganho: marginal. Risco: baixo.

**Backlog**
- [ ] Revisar o aviso "rel=canonical aponta para outro local de hreflang" em `seo.service.ts`.

---

## Como validar cada fase
1. `cd frontend && npm run build` — build de produção sem erro.
2. Deploy (Vercel) e rodar PageSpeed de novo na mesma URL.
3. Checklist de regressão da fase (diagramas, highlight, imagens, modais).

## Histórico de resultados
| Data | Fase | Performance | TBT | Observação |
|---|---|---|---|---|
| 06/jun | baseline | 45 | 1.130 ms | — |
