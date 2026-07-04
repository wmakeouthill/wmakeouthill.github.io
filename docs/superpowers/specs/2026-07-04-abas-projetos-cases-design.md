# Spec — Abas Pessoais/Profissionais, Cases no RAG e Galeria de Cases

Data: 2026-07-04
Status: aprovado em brainstorming (todas as seções validadas pelo Wesley)

## Objetivo

Reposicionar a seção de Projetos do portfólio em duas abas — **Profissionais** (alimentada pelos 19 cases de `certificados-wesley/portfolio-content/cases/`) e **Pessoais** (a atual, espelho dos repos públicos do GitHub) — e fazer os cases entrarem no RAG do chat e no pipeline de galeria/imagens já existente (GitHub → cache ETag/Caffeine → REST → SSR), sem infra nova.

## Decisões tomadas

| Decisão | Escolha |
| --- | --- |
| Classificação | Todos os 19 cases (10 freelas + 9 AutoU) vão para a aba Profissionais |
| Duplicados (Mercearia-R-V, Experimenta-ai---soneca + delivery, gerador-de-cracha) | Aparecem nas **duas** abas; aba Pessoais permanece 100% automática |
| Nomes de clientes AutoU (Saint-Gobain, Oxiquímica, JGV, Rede São Roque, Rocester) | Exibidos como estão nos markdowns (sem anonimização) |
| Libbs (LIS) e Itaú | **Não são clientes** — foram demos solo/pré-venda (LIS para edital em andamento). O frontmatter e os cards devem rotulá-los como demo, nunca como cliente em produção |
| Metadados dos cards | Frontmatter YAML em cada case `.md` |
| Layout da aba Profissionais | Vitrine estilo AutoU no topo (logos + card grande auto-rotativo) + grid de todos os cases abaixo com filtro Freelance/AutoU |
| Idiomas | Criar os 19 pares `-english.md` (frontmatter traduzido incluso) |
| Aba default | **Profissionais** |
| Arquitetura | Abordagem A — estender o pipeline existente |
| Execução | Subagentes: Sonnet 5 nas tarefas padrão, Opus/Fable nas espinhosas |

### Mapeamento case ↔ repo público (verificado em 2026-07-04 contra a API do GitHub)

- Com repo público (duplicam na aba Pessoais): `mercearia-rv` ↔ `Mercearia-R-V`; `experimenta-ai-soneca` ↔ `Experimenta-ai---soneca` + `Experimenta_ai_soneca_delivery`; `gerador-de-cracha` ↔ `gerador-de-cracha`.
- Sem repo público (só Profissionais): os 9 cases AutoU + entre-pontos-integrador, aog-dux-truck, dux-logistics-workflow, dux-nf-automacao-fiscal, whatsapp-bot-tickets-sol, dash-qualtrics-cx, notas-vue-spring.
- Não confundir: `lat_long_caminhoneiro` e `wesley-bot-whatsapp-assistant` são projetos pessoais distintos (não são o AOG nem o Sol). `escpos-virtual-printer-emulator` é repo público novo sem markdown em `projects/` (fora do escopo desta spec; aparece na aba Pessoais normalmente).

## 1. Conteúdo (repo `certificados-wesley`)

### Frontmatter YAML (19 cases, PT e EN)

```yaml
---
title: Sol — Central omnichannel de atendimento TI
client: Liquigás            # exibido no card; vira tag no RAG
category: freela            # freela | autou
status: Produção
stack: [FastAPI, Angular 20, pgvector, Gemini]
logo: logo.png              # arquivo dentro da pasta de galeria do case (opcional)
cover: cover.png            # screenshot da vitrine (opcional)
featured: true              # opcional; reservado, sem uso na v1
order: 5                    # opcional: posição na listagem dentro da categoria
gallery: mercearia-r-v      # opcional: reusa a galeria de outro slug
---
```

- Slug do case = nome do arquivo sem extensão (ex.: `whatsapp-bot-tickets-sol`).
- Pares EN: `<slug>-english.md`, mesmo padrão de sufixo já filtrado pelo backend.
- Galeria: `portfolio-gallery/<slug-do-case>/` (convenção existente, cache ETag + cache negativo já implementados). `logo` e `cover` moram nessa pasta e são servidos pela URL raw retornada na listagem (mesmo mecanismo da galeria atual).
- Duplicados reusam a galeria do repo pessoal via campo `gallery:` (ex.: case `mercearia-rv` → pasta `mercearia-r-v`), sem duplicar imagens.
- `INDEX.md` não vira card; entra no RAG como documento geral (catálogo).

### Fallbacks (assets sobem aos poucos)

- Sem `logo` → chip de texto com o nome do cliente na faixa da vitrine.
- Sem `cover` → painel gradiente no card (padrão do CaseShowcaseCard da AutoU).
- Sem pasta de galeria → botão de galeria oculto (comportamento atual da aba Pessoais).

## 2. Backend (Spring Boot)

### Ingestão

- `GithubRepositoryContentPort` + `GithubPortfolioContentAdapter` ganham `listarDocumentacoesCases()`, lendo `portfolio-content/cases/freelas` e `portfolio-content/cases/autou` com o mesmo `listarArquivosDaPasta` (ETag, TTL, cache negativo). `INDEX.md` excluído da listagem de cards.

### Frontmatter e API

- Dependência `commonmark-ext-yaml-front-matter` (extensão oficial do commonmark-java já usado no projeto).
- `CaseFrontmatterParser` (domínio) converte YAML → `CaseDto` (slug, title, client, category, status, stack[], coverUrl, logoUrl, hasGallery, gallerySlug).
- Novo endpoint `GET /api/content/cases?lang=pt|en` → lista de `CaseDto`. Ordenação determinística: categoria (freela antes de autou) → campo `order` do frontmatter (quando presente) → slug alfabético. Cacheado como o resto.
- **Sem endpoint novo para o conteúdo**: `carregarMarkdownPorProjeto` (GithubPortfolioMarkdownAdapter) passa a procurar também em `cases/freelas` e `cases/autou` — o modal de readme e a renderização SSR existentes funcionam com slug de case automaticamente. Frontmatter é removido antes de renderizar/exibir.

### RAG do chat

- Cases entram em `carregarMarkdownsDetalhados` como `projeto=true`; frontmatter removido do conteúdo e convertido em **tags** (client, category, stack) para o tag boost do `ContextSearchService` (ex.: "projeto da Libbs" acha o case).
- `ProjetoKeywordDetector` já é 100% dinâmico — os 19 cases ganham keywords automaticamente.
- `INDEX.md` entra como documento geral.
- Prompt base (`PortfolioPromptService`, PT e EN) ganha nota curta distinguindo projetos Profissionais (cases: freelas + AutoU) de Pessoais (repos GitHub), e orientando a citar a aba Profissionais.

### SEO/SSR

- Rotas reais `/cases/:slug` e `/en/cases/:slug`, mesmo esquema de `/projects/:slug` (SSR via Node sidecar + HTML cacheado no Caffeine).
- Meta/OG/JSON-LD por case no `ConstruirMetadadosSeoUseCase`; cases incluídos no sitemap (`GerarSitemapUseCase`).
- Warmup de cache inclui `GET /api/content/cases` nos dois idiomas.

### Idioma

- Mesmo mecanismo de sufixo `-english` + fallback PT já implementado no adapter. Zero lógica nova.

## 3. Frontend (Angular 20, standalone/OnPush/signals)

- Toggle de abas na seção Projetos: **Profissionais** (default) | **Pessoais**. Estado em signal; alternância não recarrega dados da outra aba desnecessariamente.
- Aba Pessoais: intocada (grid atual, GitHub API, paginação por linhas cheias, modais).
- Aba Profissionais:
  - `professional-showcase`: faixa de logos clicáveis (role tablist) + card grande (stack tags, título, cliente, status, cover, link "Ler case completo"). Auto-rotação 3,5s; pausa 15s ao clicar; pausa fora do viewport (IntersectionObserver); respeita `prefers-reduced-motion`; SSR-safe (timers/observers só no browser).
  - `case-card` + grid com filtro **Todos | Freelance | AutoU** e a paginação por linhas cheias existente.
  - Card abre o readme-modal (markdown do case via pipeline existente) e a galeria via demo-modal quando `hasGallery`.
- Visual implementado com a skill **impeccable** (frontend-design), coerente com o design system atual do site.
- i18n: novos labels (abas, filtros, "Ler case completo") nos arquivos i18n existentes; conteúdo vem do backend por idioma.
- Arquivos ≤300 linhas (regras do repo); componentes novos isolados, `projects.component` só orquestra as abas.

## 4. Erros e casos-limite

- Case sem frontmatter ou YAML inválido → case entra com metadados derivados do nome do arquivo (title = slug humanizado, category pela pasta) e log de warning; nunca derruba a listagem.
- GitHub fora do ar → comportamento atual (serve cache mesmo expirado; lista vazia como último recurso).
- Case só em PT com site em EN → fallback PT (mecanismo existente).
- `gallery:` apontando para pasta inexistente → cache negativo, botão oculto.

## 5. Testes e verificação

- Backend: units do `CaseFrontmatterParser` (frontmatter válido, inválido, ausente), da listagem de cases (ordem, idioma, exclusão do INDEX), da inclusão no RAG (tags de cliente, keyword detector enxergando cases) e do fallback de idioma.
- Frontend: specs dos componentes novos (rotação, pausa, filtro, fallbacks de logo/cover).
- End-to-end antes de concluir: app rodando, alternar abas, vitrine rotando, abrir readme e galeria de um case, chat respondendo sobre um case AutoU (ex.: Libbs) e listando projetos profissionais.

## 6. Rollout (aditivo, sem breaking)

1. Conteúdo no repo `certificados-wesley`: frontmatter nos 19 cases + 19 pares EN + pastas de galeria (cache do backend pega sozinho).
2. Backend (ingestão, endpoint, RAG, SEO) — deploy Oracle.
3. Frontend (abas + vitrine + grid) — deploy.
4. Wesley sobe logos/covers aos poucos; fallbacks seguram o visual.

## 7. Execução do plano

Implementação por subagentes (subagent-driven): **Sonnet 5** para tarefas padrão (frontmatter/traduções EN, ingestão backend, i18n, testes), **Opus/Fable** para as espinhosas (vitrine SSR-safe com auto-rotate, integração RAG/SEO). Plano detalhado em documento separado via writing-plans.

## Fora de escopo

- Migração de deploy Vercel→Oracle e demais itens do PLANO-SEO-SSR-CACHE.md não relacionados a cases.
- Métricas `[A CONFIRMAR]` dos cases (ficam fora dos cards até o Wesley confirmar; a v1 não exibe métricas numéricas na vitrine).
- Markdown/case para `escpos-virtual-printer-emulator`.
- CMS/edição via interface (conteúdo continua sendo editado por commit no repo certificados).
