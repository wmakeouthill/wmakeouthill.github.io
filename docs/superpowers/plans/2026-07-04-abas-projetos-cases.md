# Abas Pessoais/Profissionais + Cases no RAG — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Duas abas na seção Projetos (Profissionais = 19 cases do repo `certificados-wesley`; Pessoais = grid atual do GitHub), com os cases entrando no RAG do chat, no pipeline de galeria/cache existente e no SEO/SSR (`/cases/:slug`).

**Architecture:** Abordagem A da spec — estender o pipeline GitHub → cache ETag/Caffeine → REST → SSR sem infra nova. Frontmatter YAML nos cases vira `CaseDto` no backend (novo endpoint `GET /api/content/cases`); o conteúdo dos cases entra no `PortfolioContentPort` como `projeto=true` (RAG + `/api/projects/:slug/markdown/html` + sitemap ganham cases de graça). Frontend adiciona abas + vitrine auto-rotativa + grid, reusando readme-modal/demo-modal.

**Tech Stack:** Java 17 / Spring Boot 3.2.3 (Lombok, Caffeine, SnakeYAML), Angular 20 standalone/OnPush/signals, i18n por JSON bundlado.

**Spec:** `docs/superpowers/specs/2026-07-04-abas-projetos-cases-design.md`

## Global Constraints

- **Commits autorais do Wesley, SEM trailer `Co-Authored-By` e sem mencionar Claude** — vale para este repo E para o repo `certificados-wesley` (git user já configurado).
- O diretório `certificados-wesley/` na raiz é um **repositório git separado** (não é submodule; está untracked no repo principal). Commits de conteúdo são feitos DENTRO dele.
- Arquivos novos ≤ 300 linhas; Clean Architecture no backend (domain sem Spring/web; commonmark/snakeyaml só em infrastructure).
- Angular: standalone, `ChangeDetectionStrategy.OnPush`, signals, guards SSR (`typeof window !== 'undefined'` / `isPlatformBrowser`) antes de timers/observers.
- Aba default = **Profissionais**. Filtro do grid profissional: Todos | Freelance | AutoU.
- Libbs e Itaú **não são clientes**: cards/frontmatter rotulam como demo (client `"Libbs (demo — edital em andamento)"` / `"Itaú (demo de pré-venda)"`).
- Nomes dos demais clientes exibidos como estão nos markdowns.
- Sufixo de idioma: `<slug>-english.md`, fallback PT (mecanismo existente).
- Testes backend: `cd backend && mvn test` (JUnit 5 + Mockito + AssertJ, já no projeto). Frontend não tem specs/karma em uso: verificação = `npm run build` + e2e manual (desvio consciente da spec, registrado aqui).
- **Desvios da spec, decididos neste plano** (mais simples, mesmo resultado):
  1. Frontmatter parseado com **SnakeYAML** (já vem com Spring Boot; suporta `stack: [a, b]`) em vez de `commonmark-ext-yaml-front-matter`. Nenhuma dependência nova no pom.
  2. `ConstruirMetadadosSeoUseCase`/`SeoHeadBuilder` são **código morto** (nenhum caller em produção — verificado por grep). Meta/OG/JSON-LD por case são feitos onde o SEO por rota realmente acontece: `frontend/src/app/services/seo.service.ts` (roda no SSR). Sitemap continua no backend (`GerarSitemapUseCase`).
  3. Campo `featured` da spec: **omitido** dos arquivos (reservado, sem uso na v1 — YAGNI). Parser ignora chaves desconhecidas.
- Executor sugerido por tarefa (pedido do Wesley): **Sonnet 5** para tarefas padrão; **Opus/Fable** nas espinhosas. Tarefas 13–14 usam a skill **impeccable/frontend-design** para o visual.

## Estrutura de arquivos (mapa)

```text
certificados-wesley/portfolio-content/cases/
  freelas/*.md (+10 *-english.md)      ← Tarefas 1, 3 (frontmatter + EN)
  autou/*.md   (+9 *-english.md)       ← Tarefas 2, 4

backend/src/main/java/com/wmakeouthill/portfolio/
  infrastructure/markdown/CaseFrontmatter.java          ← Tarefa 5 (novo)
  infrastructure/markdown/CaseFrontmatterParser.java    ← Tarefa 5 (novo)
  application/port/out/GithubRepositoryContentPort.java ← Tarefa 6 (+1 método)
  infrastructure/github/GithubPortfolioContentAdapter.java ← Tarefa 6
  application/dto/CaseDto.java                          ← Tarefa 7 (novo)
  application/usecase/ListarCasesUseCase.java           ← Tarefa 7 (novo)
  infrastructure/web/PortfolioContentController.java    ← Tarefa 8 (+endpoint)
  infrastructure/content/CaseMarkdownSupport.java       ← Tarefa 9 (novo)
  infrastructure/content/GithubPortfolioMarkdownAdapter.java ← Tarefa 9
  domain/service/PortfolioPromptService.java            ← Tarefa 10
  application/seo/GerarSitemapUseCase.java              ← Tarefa 11
  application/usecase/RenderizarPaginaPublicaUseCase.java ← Tarefa 11
  infrastructure/web/PublicPageController.java          ← Tarefa 11
  infrastructure/warmup/EdgeCacheWarmupScheduler.java   ← Tarefa 11

frontend/src/app/
  models/interfaces.ts (CaseItem)                       ← Tarefa 12
  services/cases.service.ts                             ← Tarefa 12 (novo)
  services/seo.service.ts (branch /cases/)              ← Tarefa 12
  app.routes.ts (cases/:slug)                           ← Tarefa 12
  ../assets/i18n/pt.json + en.json                      ← Tarefa 12
  components/projects/projects.component.{ts,html}      ← Tarefa 13 (abas)
  components/projects/case-card/*                       ← Tarefa 13 (novo)
  components/projects/professional-cases/*              ← Tarefa 13 (novo)
  components/projects/professional-showcase/*           ← Tarefa 14 (novo, vitrine)
```

---

### Tarefa 1: Frontmatter PT nos 10 cases freelance

**Executor sugerido:** Sonnet 5.

**Files:**
- Modify: `certificados-wesley/portfolio-content/cases/freelas/*.md` (10 arquivos)

**Interfaces:**
- Produces: bloco YAML no topo de cada case, delimitado por `---`, com chaves `title`, `client` (opcional), `category`, `status`, `stack`, `order`, `gallery` (opcional). O parser da Tarefa 5 lê exatamente essas chaves.

- [ ] **Step 1: Inserir o frontmatter no topo de cada arquivo**

Inserir o bloco abaixo como PRIMEIRAS linhas de cada arquivo (antes do `# Case — ...`), sem alterar o corpo existente. Blocos exatos:

`freelas/entre-pontos-integrador.md`:
```yaml
---
title: Entre Pontos — Renovação do frontend do integrador EDI logístico
client: Entre Pontos
category: freela
status: Produção
stack: [Next.js 16, React 19, Tailwind 4]
order: 1
---
```

`freelas/aog-dux-truck.md`:
```yaml
---
title: AOG Dux Truck — Operação logística emergencial
client: Dux Logistics
category: freela
status: Produção
stack: [Java 21, Spring Boot 3, Angular 20, Entra ID]
order: 2
---
```

`freelas/dux-logistics-workflow.md`:
```yaml
---
title: Dux Workflow — Plataforma de workflow logístico e documental
client: Dux Logistics
category: freela
status: Homologação
stack: [Java, Spring Boot, Angular, PostgreSQL]
order: 3
---
```

`freelas/dux-nf-automacao-fiscal.md`:
```yaml
---
title: Automação fiscal de NF-e por e-mail com IA
client: Dux Logistics
category: freela
status: Produção
stack: [FastAPI, React, MS Graph, PostgreSQL]
order: 4
---
```

`freelas/whatsapp-bot-tickets-sol.md`:
```yaml
---
title: Sol — Central omnichannel de atendimento de TI com IA
client: Cliente corporativo
category: freela
status: Produção
stack: [FastAPI, Angular 20, pgvector, Gemini]
order: 5
---
```

`freelas/dash-qualtrics-cx.md`:
```yaml
---
title: Dashboard CX por jornada + MCP server Qualtrics
client: Cliente corporativo
category: freela
status: Produção
stack: [FastAPI, Angular, Gemini, Qualtrics]
order: 6
---
```

`freelas/gerador-de-cracha.md`:
```yaml
---
title: Gerador de crachás em lote
client: Supermercados Rio Sul
category: freela
status: Entregue
stack: [Python, PyInstaller]
order: 7
---
```

`freelas/notas-vue-spring.md` (sem client — estudo):
```yaml
---
title: App de anotações + comparativo Vue/React/Angular
category: freela
status: Estudo
stack: [Vue 3, Spring Boot, SQLite]
order: 8
---
```

`freelas/mercearia-rv.md` (galeria aliasada para o slug do repo público):
```yaml
---
title: Mercearia R&V — PDV desktop offline-first
client: Mercearia R&V
category: freela
status: Produção
stack: [Java 21, Spring Boot, Angular 20, Electron]
order: 9
gallery: mercearia-r-v
---
```

`freelas/experimenta-ai-soneca.md` (galeria aliasada para o slug do repo público):
```yaml
---
title: Experimenta AI — Gestão completa de lanchonete + delivery
client: Soneca
category: freela
status: Produção
stack: [Java, Spring Boot, Angular 17, Electron, MySQL]
order: 10
gallery: experimenta-ai---soneca
---
```

Observações: NÃO adicionar `logo:`/`cover:` (a resolução é por convenção — arquivos `logo.*`/`cover.*` na pasta de galeria, ver Tarefa 7). `[A CONFIRMAR]` do corpo fica como está (não aparece nos cards).

- [ ] **Step 2: Verificar que os 10 arquivos têm frontmatter válido**

Run (na raiz do repo principal):
```bash
python -c "
import glob, re, yaml
ok = True
for f in glob.glob('certificados-wesley/portfolio-content/cases/freelas/*.md'):
    if f.endswith('-english.md'): continue
    text = open(f, encoding='utf-8').read()
    m = re.match(r'\A---\r?\n(.*?)\r?\n---\r?\n', text, re.S)
    if not m: print('SEM FRONTMATTER:', f); ok = False; continue
    d = yaml.safe_load(m.group(1))
    for k in ('title', 'category', 'status', 'stack', 'order'):
        if k not in d: print('FALTA', k, 'em', f); ok = False
print('OK' if ok else 'FALHOU')"
```
Expected: `OK`

- [ ] **Step 3: Commit (dentro do repo certificados-wesley, como Wesley, sem co-autoria)**

```bash
cd certificados-wesley
git add portfolio-content/cases/freelas
git commit -m "feat(cases): frontmatter YAML nos 10 cases freelance"
cd ..
```

### Tarefa 2: Frontmatter PT nos 9 cases AutoU

**Executor sugerido:** Sonnet 5.

**Files:**
- Modify: `certificados-wesley/portfolio-content/cases/autou/*.md` (9 arquivos)

**Interfaces:**
- Produces: mesmo schema YAML da Tarefa 1, `category: autou`.

- [ ] **Step 1: Inserir o frontmatter no topo de cada arquivo**

`autou/jgv-previsao-demanda.md`:
```yaml
---
title: JGV — Previsão de demanda e recomendação de estoque
client: JGV
category: autou
status: Produção
stack: [Python, Prophet, Flask, PostgreSQL]
order: 1
---
```

`autou/pulse-visao-computacional.md`:
```yaml
---
title: Pulse — Conformidade de postos com visão computacional
client: Rede São Roque
category: autou
status: Produção
stack: [YOLO, FastAPI, LangGraph, Gemini, AWS]
order: 2
---
```

`autou/saint-gobain-replica-ai.md`:
```yaml
---
title: Réplica AI — Replicação de projetos de savings entre fábricas
client: Saint-Gobain
category: autou
status: Produção
stack: [FastAPI, Cloud Run, Firestore, Pub/Sub]
order: 3
---
```

`autou/libbs-lis-assistente-sac.md` (demo, NUNCA cliente em produção):
```yaml
---
title: LIS — Triagem de tickets SAC com IA (demo)
client: Libbs (demo — edital em andamento)
category: autou
status: Demo no ar
stack: [FastAPI, React 19, Gemini]
order: 4
---
```

`autou/oxiquimica-plataforma-ped.md`:
```yaml
---
title: Colibri — P&D de formulações com otimização Bayesiana
client: Oxiquímica
category: autou
status: Produção
stack: [FastAPI, React 19, Vertex AI, BayBE]
order: 5
---
```

`autou/rocester-catalogo-inteligente.md`:
```yaml
---
title: Catálogo inteligente de peças com ingestão de PDF por IA
client: Rocester
category: autou
status: Produção
stack: [FastAPI, React, Gemini Vision, pgvector]
order: 6
---
```

`autou/aura-central-autou.md`:
```yaml
---
title: Aura Central — Notificações e logs em plataforma B2B
client: AutoU
category: autou
status: Produção
stack: [FastAPI, React, RabbitMQ]
order: 7
---
```

`autou/autou-website.md`:
```yaml
---
title: Site institucional AutoU — SEO, blog, leads e CMS próprio
client: AutoU
category: autou
status: No ar
stack: [React, FastAPI, Azure]
order: 8
---
```

`autou/itau-demo.md` (demo, NUNCA cliente):
```yaml
---
title: Demo de pré-venda — mapas interativos
client: Itaú (demo de pré-venda)
category: autou
status: Entregue (demo)
stack: [React 19, Tailwind 4, Leaflet]
order: 9
---
```

Antes de commitar, conferir a chave `stack` de `aura-central-autou.md` contra o corpo do case (se o case não citar RabbitMQ, usar as tecnologias de eventos que o corpo cita — a fonte de verdade é o corpo do case).

- [ ] **Step 2: Verificar**

Mesmo script da Tarefa 1 Step 2, trocando `freelas` por `autou`. Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd certificados-wesley
git add portfolio-content/cases/autou
git commit -m "feat(cases): frontmatter YAML nos 9 cases AutoU"
cd ..
```

### Tarefa 3: Pares EN dos 10 cases freelance

**Executor sugerido:** Sonnet 5.

**Files:**
- Create: `certificados-wesley/portfolio-content/cases/freelas/<slug>-english.md` (10 arquivos)

**Interfaces:**
- Consumes: arquivos PT com frontmatter (Tarefa 1).
- Produces: pares `-english.md` que o filtro de idioma existente (`filtrarPorIdioma`, sufixo `-english`) seleciona quando `lang=en`.

- [ ] **Step 1: Criar os 10 arquivos `-english.md`**

Para cada `freelas/<slug>.md`, criar `freelas/<slug>-english.md` com: (a) frontmatter copiado, trocando APENAS `title` e `status` pelas versões EN da tabela abaixo (`client`, `category`, `stack`, `order`, `gallery` intactos); (b) corpo inteiro traduzido para inglês profissional (manter estrutura de headings, negritos, listas e os marcadores `[A CONFIRMAR]` como `[TO CONFIRM]`).

| slug | title (EN) | status (EN) |
| --- | --- | --- |
| entre-pontos-integrador | Entre Pontos — Frontend renewal of the EDI logistics integrator | Production |
| aog-dux-truck | AOG Dux Truck — Emergency logistics operations system | Production |
| dux-logistics-workflow | Dux Workflow — Logistics & document workflow platform | UAT |
| dux-nf-automacao-fiscal | AI-powered invoice (NF-e) email automation | Production |
| whatsapp-bot-tickets-sol | Sol — Omnichannel IT service desk with AI | Production |
| dash-qualtrics-cx | CX journey dashboard + Qualtrics MCP server | Production |
| gerador-de-cracha | Batch badge generator | Delivered |
| notas-vue-spring | Notes app + Vue/React/Angular comparison | Study |
| mercearia-rv | Mercearia R&V — Offline-first desktop POS | Production |
| experimenta-ai-soneca | Experimenta AI — Full restaurant management + delivery | Production |

- [ ] **Step 2: Verificar pares e frontmatter**

```bash
python -c "
import glob, re, yaml, os
ok = True
for f in glob.glob('certificados-wesley/portfolio-content/cases/freelas/*.md'):
    if f.endswith('-english.md'): continue
    en = f[:-3] + '-english.md'
    if not os.path.exists(en): print('SEM PAR EN:', f); ok = False; continue
    t = open(en, encoding='utf-8').read()
    m = re.match(r'\A---\r?\n(.*?)\r?\n---\r?\n', t, re.S)
    if not m: print('SEM FRONTMATTER:', en); ok = False; continue
    d = yaml.safe_load(m.group(1))
    if 'title' not in d or 'order' not in d: print('CHAVES FALTANDO:', en); ok = False
print('OK' if ok else 'FALHOU')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd certificados-wesley
git add portfolio-content/cases/freelas
git commit -m "feat(cases): English versions of the 10 freelance cases"
cd ..
```

### Tarefa 4: Pares EN dos 9 cases AutoU

**Executor sugerido:** Sonnet 5.

**Files:**
- Create: `certificados-wesley/portfolio-content/cases/autou/<slug>-english.md` (9 arquivos)

- [ ] **Step 1: Criar os 9 arquivos `-english.md`** (mesmas regras da Tarefa 3)

| slug | title (EN) | status (EN) |
| --- | --- | --- |
| jgv-previsao-demanda | JGV — Demand forecasting and stock recommendation | Production |
| pulse-visao-computacional | Pulse — Gas station compliance with computer vision | Production |
| saint-gobain-replica-ai | Replica AI — Replicating savings projects across plants | Production |
| libbs-lis-assistente-sac | LIS — AI-powered SAC ticket triage (demo) | Live demo |
| oxiquimica-plataforma-ped | Colibri — R&D formulation platform with Bayesian optimization | Production |
| rocester-catalogo-inteligente | AI-powered parts catalog with PDF ingestion | Production |
| aura-central-autou | Aura Central — Notifications & logs in a B2B platform | Production |
| autou-website | AutoU institutional website — SEO, blog, leads and custom CMS | Live |
| itau-demo | Pre-sales demo — interactive maps | Delivered (demo) |

No frontmatter EN, `client` de Libbs vira `Libbs (demo — public bid in progress)` e do Itaú vira `Itaú (pre-sales demo)`.

- [ ] **Step 2: Verificar** — mesmo script da Tarefa 3 Step 2 com `autou`. Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd certificados-wesley
git add portfolio-content/cases/autou
git commit -m "feat(cases): English versions of the 9 AutoU cases"
cd ..
```

- [ ] **Step 4: Push do repo de conteúdo** (o backend em produção só enxerga o que está no GitHub)

```bash
cd certificados-wesley && git push && cd ..
```

### Tarefa 5: CaseFrontmatterParser (SnakeYAML)

**Executor sugerido:** Sonnet 5.

**Files:**
- Create: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/markdown/CaseFrontmatter.java`
- Create: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/markdown/CaseFrontmatterParser.java`
- Test: `backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/markdown/CaseFrontmatterParserTest.java`

**Interfaces:**
- Produces: `CaseFrontmatterParser.extrair(String markdown)` → `CaseFrontmatter(title, client, category, status, stack, logo, cover, order, gallery, corpo)`. `corpo` SEMPRE vem sem o bloco YAML (mesmo com YAML inválido). Campos ausentes = `null` (stack = lista vazia). Tarefas 7 e 9 consomem exatamente essa assinatura.

- [ ] **Step 1: Escrever o teste que falha**

```java
package com.wmakeouthill.portfolio.infrastructure.markdown;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CaseFrontmatterParserTest {

  private final CaseFrontmatterParser parser = new CaseFrontmatterParser();

  @Test
  void extrair_comFrontmatterCompleto_devePreencherCamposERemoverBlocoDoCorpo() {
    String md = """
        ---
        title: Sol — Central omnichannel
        client: Cliente corporativo
        category: freela
        status: Produção
        stack: [FastAPI, Angular 20, pgvector]
        order: 5
        gallery: mercearia-r-v
        ---
        # Case — Sol

        Corpo do case.
        """;

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isEqualTo("Sol — Central omnichannel");
    assertThat(fm.client()).isEqualTo("Cliente corporativo");
    assertThat(fm.category()).isEqualTo("freela");
    assertThat(fm.status()).isEqualTo("Produção");
    assertThat(fm.stack()).containsExactly("FastAPI", "Angular 20", "pgvector");
    assertThat(fm.order()).isEqualTo(5);
    assertThat(fm.gallery()).isEqualTo("mercearia-r-v");
    assertThat(fm.corpo()).startsWith("# Case — Sol");
    assertThat(fm.corpo()).doesNotContain("---");
  }

  @Test
  void extrair_semFrontmatter_deveDevolverCorpoIntactoECamposNulos() {
    String md = "# Case sem frontmatter\n\nCorpo.";

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isNull();
    assertThat(fm.stack()).isEmpty();
    assertThat(fm.order()).isNull();
    assertThat(fm.corpo()).isEqualTo(md);
  }

  @Test
  void extrair_comYamlInvalido_deveRemoverBlocoEManterCamposNulos() {
    String md = "---\ntitle: [aberto sem fechar\n---\n# Corpo\n";

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isNull();
    assertThat(fm.corpo()).startsWith("# Corpo");
  }

  @Test
  void extrair_comCrlf_deveFuncionar() {
    String md = "---\r\ntitle: Case CRLF\r\n---\r\n# Corpo\r\n";

    CaseFrontmatter fm = parser.extrair(md);

    assertThat(fm.title()).isEqualTo("Case CRLF");
    assertThat(fm.corpo()).startsWith("# Corpo");
  }

  @Test
  void extrair_nulo_deveDevolverVazio() {
    CaseFrontmatter fm = parser.extrair(null);

    assertThat(fm.corpo()).isEmpty();
    assertThat(fm.title()).isNull();
  }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn test -Dtest=CaseFrontmatterParserTest`
Expected: FALHA de compilação (`CaseFrontmatterParser` não existe).

- [ ] **Step 3: Implementar**

`CaseFrontmatter.java`:
```java
package com.wmakeouthill.portfolio.infrastructure.markdown;

import java.util.List;

/**
 * Metadados extraídos do frontmatter YAML de um case profissional, mais o
 * corpo do markdown já sem o bloco YAML. Campos ausentes ficam null
 * (stack = lista vazia); quem consome decide o fallback.
 */
public record CaseFrontmatter(
    String title,
    String client,
    String category,
    String status,
    List<String> stack,
    String logo,
    String cover,
    Integer order,
    String gallery,
    String corpo) {

  public static CaseFrontmatter vazio(String corpo) {
    return new CaseFrontmatter(null, null, null, null, List.of(), null, null, null, null, corpo);
  }
}
```

`CaseFrontmatterParser.java`:
```java
package com.wmakeouthill.portfolio.infrastructure.markdown;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrai o frontmatter YAML (delimitado por ---) dos cases profissionais.
 * Usa SnakeYAML (já no classpath do Spring Boot) com SafeConstructor.
 * YAML inválido nunca derruba a listagem: loga warning e devolve só o corpo.
 */
@Slf4j
@Component
public class CaseFrontmatterParser {

  private static final Pattern FRONTMATTER =
      Pattern.compile("\\A---\\r?\\n(.*?)\\r?\\n---\\r?\\n?", Pattern.DOTALL);

  public CaseFrontmatter extrair(String markdown) {
    if (markdown == null) {
      return CaseFrontmatter.vazio("");
    }
    Matcher matcher = FRONTMATTER.matcher(markdown);
    if (!matcher.find()) {
      return CaseFrontmatter.vazio(markdown);
    }
    String corpo = markdown.substring(matcher.end());
    try {
      Object dados = new Yaml(new SafeConstructor(new LoaderOptions())).load(matcher.group(1));
      if (!(dados instanceof Map<?, ?> campos)) {
        return CaseFrontmatter.vazio(corpo);
      }
      return new CaseFrontmatter(
          texto(campos, "title"),
          texto(campos, "client"),
          texto(campos, "category"),
          texto(campos, "status"),
          lista(campos, "stack"),
          texto(campos, "logo"),
          texto(campos, "cover"),
          inteiro(campos, "order"),
          texto(campos, "gallery"),
          corpo);
    } catch (RuntimeException e) {
      log.warn("Frontmatter YAML inválido, usando fallback derivado do nome: {}", e.getMessage());
      return CaseFrontmatter.vazio(corpo);
    }
  }

  private String texto(Map<?, ?> campos, String chave) {
    Object valor = campos.get(chave);
    return valor == null ? null : valor.toString().trim();
  }

  private Integer inteiro(Map<?, ?> campos, String chave) {
    Object valor = campos.get(chave);
    if (valor instanceof Number numero) {
      return numero.intValue();
    }
    try {
      return valor == null ? null : Integer.valueOf(valor.toString().trim());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private List<String> lista(Map<?, ?> campos, String chave) {
    Object valor = campos.get(chave);
    if (!(valor instanceof List<?> itens)) {
      return List.of();
    }
    List<String> resultado = new ArrayList<>();
    for (Object item : itens) {
      if (item != null && !item.toString().isBlank()) {
        resultado.add(item.toString().trim());
      }
    }
    return List.copyOf(resultado);
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn test -Dtest=CaseFrontmatterParserTest`
Expected: `Tests run: 5, Failures: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/markdown/CaseFrontmatter.java backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/markdown/CaseFrontmatterParser.java backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/markdown/CaseFrontmatterParserTest.java
git commit -m "feat(backend): parser de frontmatter YAML dos cases profissionais"
```

### Tarefa 6: Ingestão — listarDocumentacoesCases no port e adapter GitHub

**Executor sugerido:** Sonnet 5.

**Files:**
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/application/port/out/GithubRepositoryContentPort.java`
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/github/GithubPortfolioContentAdapter.java`
- Test: `backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/github/GithubPortfolioContentAdapterCasesTest.java`

**Interfaces:**
- Produces: `List<RepositoryFileDto> listarDocumentacoesCases()` — markdowns de `portfolio-content/cases/freelas` + `portfolio-content/cases/autou`, ordenados por path. `INDEX.md` (que fica em `portfolio-content/cases/`, raiz) NÃO entra aqui; ele entra em `listarDocumentacoes()` como documento geral do RAG. Tarefas 7 e 9 consomem este método.

- [ ] **Step 1: Escrever o teste que falha**

```java
package com.wmakeouthill.portfolio.infrastructure.github;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.infrastructure.cache.GithubContentCache;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GithubPortfolioContentAdapterCasesTest {

  private final GithubHttpClient httpClient = mock(GithubHttpClient.class);
  private final GithubContentCache cache = mock(GithubContentCache.class);
  private final GithubPortfolioContentAdapter adapter =
      new GithubPortfolioContentAdapter(httpClient, cache);

  @Test
  void listarDocumentacoesCases_deveJuntarFreelasEAutouOrdenadoPorPath() {
    when(cache.getFileList(anyString())).thenReturn(Optional.of(List.of()));
    when(cache.getFileList("list:portfolio-content/cases/freelas"))
        .thenReturn(Optional.of(List.of(md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md"))));
    when(cache.getFileList("list:portfolio-content/cases/autou"))
        .thenReturn(Optional.of(List.of(md("itau-demo", "portfolio-content/cases/autou/itau-demo.md"))));

    List<RepositoryFileDto> cases = adapter.listarDocumentacoesCases();

    assertThat(cases).extracting(RepositoryFileDto::path).containsExactly(
        "portfolio-content/cases/autou/itau-demo.md",
        "portfolio-content/cases/freelas/mercearia-rv.md");
  }

  @Test
  void listarDocumentacoes_deveIncluirIndexDosCasesComoDocumentoGeral() {
    when(cache.getFileList(anyString())).thenReturn(Optional.of(List.of()));
    when(cache.getFileList("list:portfolio-content/cases"))
        .thenReturn(Optional.of(List.of(md("INDEX", "portfolio-content/cases/INDEX.md"))));

    List<RepositoryFileDto> docs = adapter.listarDocumentacoes();

    assertThat(docs).extracting(RepositoryFileDto::path)
        .contains("portfolio-content/cases/INDEX.md");
  }

  private RepositoryFileDto md(String nome, String path) {
    return new RepositoryFileDto(nome + ".md", nome, path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + nome, "file");
  }
}
```

Nota: se o construtor/pacote de `GithubContentCache` ou `GithubHttpClient` divergirem (ex.: cache em outro pacote), ajustar apenas os imports do teste — as classes já existem e são usadas pelo adapter.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn test -Dtest=GithubPortfolioContentAdapterCasesTest`
Expected: FALHA de compilação (`listarDocumentacoesCases` não existe).

- [ ] **Step 3: Implementar**

Em `GithubRepositoryContentPort.java`, adicionar após `listarDocumentacoesTrabalhos()`:
```java
  /**
   * Lista os markdowns de cases profissionais
   * (portfolio-content/cases/freelas e portfolio-content/cases/autou).
   * INDEX.md fica fora (é documento geral, não case).
   */
  List<RepositoryFileDto> listarDocumentacoesCases();
```

Em `GithubPortfolioContentAdapter.java`:

1. Novas constantes (junto das existentes):
```java
  private static final String CASES_PATH = CONTENT_PATH + "/cases";
  private static final String CASES_FREELAS_PATH = CASES_PATH + "/freelas";
  private static final String CASES_AUTOU_PATH = CASES_PATH + "/autou";
```

2. Em `listarDocumentacoes()`, adicionar a linha do INDEX (documentos gerais do RAG) — o método fica:
```java
  @Override
  public List<RepositoryFileDto> listarDocumentacoes() {
    List<RepositoryFileDto> todos = new ArrayList<>();
    todos.addAll(listarMarkdownsDaPasta(CONTENT_PATH));
    todos.addAll(listarMarkdownsDaPasta(CASES_PATH));
    todos.addAll(listarDocumentacoesProjetos());
    todos.addAll(listarDocumentacoesTrabalhos());
    return todos.stream()
        .sorted(Comparator.comparing(RepositoryFileDto::path))
        .toList();
  }
```
(`listarMarkdownsDaPasta(CASES_PATH)` devolve só `INDEX.md`: a API do GitHub lista as subpastas como `type=dir`, que o filtro `isMarkdown` descarta.)

3. Novo método, após `listarDocumentacoesTrabalhos()`:
```java
  @Override
  public List<RepositoryFileDto> listarDocumentacoesCases() {
    List<RepositoryFileDto> todos = new ArrayList<>();
    todos.addAll(listarMarkdownsDaPasta(CASES_FREELAS_PATH));
    todos.addAll(listarMarkdownsDaPasta(CASES_AUTOU_PATH));
    return todos.stream()
        .sorted(Comparator.comparing(RepositoryFileDto::path))
        .toList();
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn test -Dtest=GithubPortfolioContentAdapterCasesTest`
Expected: `Tests run: 2, Failures: 0`

- [ ] **Step 5: Rodar a suíte inteira** (o port ganhou método novo; se existir outra implementação do port, o build acusa — implementar lá também devolvendo `List.of()`)

Run: `cd backend && mvn test`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/wmakeouthill/portfolio/application/port/out/GithubRepositoryContentPort.java backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/github/GithubPortfolioContentAdapter.java backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/github/GithubPortfolioContentAdapterCasesTest.java
git commit -m "feat(backend): ingestão dos cases profissionais do repo de conteúdo"
```

### Tarefa 7: CaseDto + ListarCasesUseCase

**Executor sugerido:** Sonnet 5.

**Files:**
- Create: `backend/src/main/java/com/wmakeouthill/portfolio/application/dto/CaseDto.java`
- Create: `backend/src/main/java/com/wmakeouthill/portfolio/application/usecase/ListarCasesUseCase.java`
- Test: `backend/src/test/java/com/wmakeouthill/portfolio/application/usecase/ListarCasesUseCaseTest.java`

**Interfaces:**
- Consumes: `GithubRepositoryContentPort.listarDocumentacoesCases()/obterMarkdownConteudo(path)/listarGaleriaProjeto(slug)` (Tarefa 6); `CaseFrontmatterParser.extrair(String)` (Tarefa 5).
- Produces: `List<CaseDto> executar(String language)` com `CaseDto(String slug, String title, String client, String category, String status, List<String> stack, String coverUrl, String logoUrl, boolean hasGallery, String gallerySlug, Integer order)`. Ordenação: `freela` antes de `autou` → `order` asc (null por último) → slug alfabético. JSON consumido pelo frontend na Tarefa 12 com exatamente esses nomes de campo.

- [ ] **Step 1: Escrever o teste que falha**

```java
package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CaseDto;
import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ListarCasesUseCaseTest {

  private final GithubRepositoryContentPort port = mock(GithubRepositoryContentPort.class);
  private final ListarCasesUseCase useCase = new ListarCasesUseCase(port, new CaseFrontmatterParser());

  @Test
  void executar_deveOrdenarFreelaAntesDeAutouEPorOrder() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("itau-demo", "portfolio-content/cases/autou/itau-demo.md"),
        md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md"),
        md("aog-dux-truck", "portfolio-content/cases/freelas/aog-dux-truck.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/autou/itau-demo.md"))
        .thenReturn(Optional.of(caseMd("Itaú demo", "autou", 9)));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/mercearia-rv.md"))
        .thenReturn(Optional.of(caseMd("Mercearia R&V", "freela", 9)));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/aog-dux-truck.md"))
        .thenReturn(Optional.of(caseMd("AOG", "freela", 2)));

    List<CaseDto> cases = useCase.executar("pt");

    assertThat(cases).extracting(CaseDto::slug)
        .containsExactly("aog-dux-truck", "mercearia-rv", "itau-demo");
  }

  @Test
  void executar_emIngles_devePreferirVarianteEnglishEFazerFallbackPt() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md"),
        md("mercearia-rv-english", "portfolio-content/cases/freelas/mercearia-rv-english.md"),
        md("aog-dux-truck", "portfolio-content/cases/freelas/aog-dux-truck.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/mercearia-rv-english.md"))
        .thenReturn(Optional.of(caseMd("Mercearia R&V — Offline-first POS", "freela", 1)));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/aog-dux-truck.md"))
        .thenReturn(Optional.of(caseMd("AOG (só PT)", "freela", 2)));

    List<CaseDto> cases = useCase.executar("en");

    assertThat(cases).extracting(CaseDto::slug)
        .containsExactly("mercearia-rv", "aog-dux-truck");
    assertThat(cases.get(0).title()).contains("Offline-first POS");
  }

  @Test
  void executar_semFrontmatter_deveDerivarTituloDoSlugECategoriaDoPath() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("itau-demo", "portfolio-content/cases/autou/itau-demo.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/autou/itau-demo.md"))
        .thenReturn(Optional.of("# Case sem frontmatter\nCorpo."));

    List<CaseDto> cases = useCase.executar("pt");

    assertThat(cases).hasSize(1);
    assertThat(cases.get(0).title()).isEqualTo("Itau Demo");
    assertThat(cases.get(0).category()).isEqualTo("autou");
    assertThat(cases.get(0).client()).isNull();
  }

  @Test
  void executar_comGalleryAlias_deveResolverGaleriaCoverELogoPorConvencao() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("mercearia-rv", "portfolio-content/cases/freelas/mercearia-rv.md")));
    when(port.obterMarkdownConteudo("portfolio-content/cases/freelas/mercearia-rv.md"))
        .thenReturn(Optional.of("""
            ---
            title: Mercearia R&V
            category: freela
            gallery: mercearia-r-v
            ---
            corpo"""));
    when(port.listarGaleriaProjeto("mercearia-r-v")).thenReturn(List.of(
        midia("cover.png", "portfolio-gallery/mercearia-r-v/cover.png"),
        midia("logo.webp", "portfolio-gallery/mercearia-r-v/logo.webp"),
        midia("tela1.png", "portfolio-gallery/mercearia-r-v/tela1.png")));

    List<CaseDto> cases = useCase.executar("pt");

    CaseDto dto = cases.get(0);
    assertThat(dto.gallerySlug()).isEqualTo("mercearia-r-v");
    assertThat(dto.hasGallery()).isTrue();
    assertThat(dto.coverUrl()).endsWith("mercearia-r-v/cover.png");
    assertThat(dto.logoUrl()).endsWith("mercearia-r-v/logo.webp");
  }

  @Test
  void executar_semGaleria_deveDevolverHasGalleryFalseEUrlsNulas() {
    when(port.listarDocumentacoesCases()).thenReturn(List.of(
        md("itau-demo", "portfolio-content/cases/autou/itau-demo.md")));
    when(port.listarGaleriaProjeto(anyString())).thenReturn(List.of());
    when(port.obterMarkdownConteudo("portfolio-content/cases/autou/itau-demo.md"))
        .thenReturn(Optional.of("corpo"));

    List<CaseDto> cases = useCase.executar("pt");

    assertThat(cases.get(0).hasGallery()).isFalse();
    assertThat(cases.get(0).coverUrl()).isNull();
    assertThat(cases.get(0).logoUrl()).isNull();
  }

  private RepositoryFileDto md(String nome, String path) {
    return new RepositoryFileDto(nome + ".md", nome, path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + nome, "file");
  }

  private RepositoryFileDto midia(String arquivo, String path) {
    return new RepositoryFileDto(arquivo, arquivo.substring(0, arquivo.lastIndexOf('.')), path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + arquivo, "file");
  }

  private String caseMd(String title, String category, int order) {
    return "---\ntitle: " + title + "\ncategory: " + category + "\norder: " + order + "\n---\ncorpo";
  }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn test -Dtest=ListarCasesUseCaseTest`
Expected: FALHA de compilação (`CaseDto`/`ListarCasesUseCase` não existem).

- [ ] **Step 3: Implementar**

`CaseDto.java`:
```java
package com.wmakeouthill.portfolio.application.dto;

import java.util.List;

/**
 * Card de case profissional exibido na aba Profissionais.
 * Serializado como JSON em GET /api/content/cases.
 */
public record CaseDto(
    String slug,
    String title,
    String client,
    String category,
    String status,
    List<String> stack,
    String coverUrl,
    String logoUrl,
    boolean hasGallery,
    String gallerySlug,
    Integer order) {
}
```

`ListarCasesUseCase.java`:
```java
package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CaseDto;
import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.infrastructure.config.CaffeineCacheConfig;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatter;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Lista os cases profissionais (freelas + AutoU) como cards para a aba
 * Profissionais. Metadados vêm do frontmatter YAML; case sem frontmatter
 * entra com título derivado do slug e categoria derivada da pasta (warning),
 * nunca derruba a listagem. Galeria/cover/logo resolvidos pela convenção
 * portfolio-gallery/<gallerySlug>/ (cover.* e logo.*).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListarCasesUseCase {

  private static final String ENGLISH_SUFFIX = "-english";

  private final GithubRepositoryContentPort contentPort;
  private final CaseFrontmatterParser frontmatterParser;

  @Cacheable(cacheNames = CaffeineCacheConfig.CACHE_GITHUB_DATA, key = "'cases:' + #language")
  public List<CaseDto> executar(String language) {
    boolean english = language != null && language.toLowerCase(Locale.ROOT).startsWith("en");
    List<CaseDto> cases = new ArrayList<>();
    for (RepositoryFileDto doc : filtrarPorIdioma(contentPort.listarDocumentacoesCases(), english)) {
      montarCase(doc).ifPresent(cases::add);
    }
    cases.sort(Comparator
        .comparing((CaseDto c) -> "autou".equals(c.category()) ? 1 : 0)
        .thenComparing(c -> c.order() == null ? Integer.MAX_VALUE : c.order())
        .thenComparing(CaseDto::slug));
    return cases;
  }

  private Optional<CaseDto> montarCase(RepositoryFileDto doc) {
    Optional<String> conteudo = contentPort.obterMarkdownConteudo(doc.path());
    if (conteudo.isEmpty() || conteudo.get().isBlank()) {
      return Optional.empty();
    }
    CaseFrontmatter fm = frontmatterParser.extrair(conteudo.get());
    String slug = baseName(doc.displayName());
    if (fm.title() == null) {
      log.warn("Case {} sem frontmatter válido; usando metadados derivados do nome", doc.path());
    }
    String categoria = fm.category() != null ? fm.category()
        : (doc.path().contains("/autou/") ? "autou" : "freela");
    String gallerySlug = fm.gallery() != null ? fm.gallery() : slug;
    List<RepositoryFileDto> galeria = contentPort.listarGaleriaProjeto(gallerySlug);
    return Optional.of(new CaseDto(
        slug,
        fm.title() != null ? fm.title() : humanizar(slug),
        fm.client(),
        categoria,
        fm.status(),
        fm.stack(),
        resolverMidia(galeria, fm.cover(), "cover."),
        resolverMidia(galeria, fm.logo(), "logo."),
        !galeria.isEmpty(),
        gallerySlug,
        fm.order()));
  }

  /** Prioriza o nome do frontmatter; sem ele, convenção cover.*/logo.* na galeria. */
  private String resolverMidia(List<RepositoryFileDto> galeria, String nomePreferido, String prefixo) {
    for (RepositoryFileDto arquivo : galeria) {
      String nome = arquivo.fileName().toLowerCase(Locale.ROOT);
      if (nomePreferido != null ? nome.equalsIgnoreCase(nomePreferido) : nome.startsWith(prefixo)) {
        return arquivo.downloadUrl();
      }
    }
    return null;
  }

  /** Mesma regra de idioma do GithubPortfolioMarkdownAdapter (sufixo -english + fallback PT). */
  private List<RepositoryFileDto> filtrarPorIdioma(List<RepositoryFileDto> docs, boolean english) {
    Map<String, RepositoryFileDto> escolhidos = new LinkedHashMap<>();
    for (RepositoryFileDto doc : docs) {
      String base = baseName(doc.displayName());
      boolean isEnglish = doc.displayName().toLowerCase(Locale.ROOT).endsWith(ENGLISH_SUFFIX);
      RepositoryFileDto atual = escolhidos.get(base);
      if (atual == null || (english == isEnglish)) {
        escolhidos.put(base, doc);
      }
    }
    return new ArrayList<>(escolhidos.values());
  }

  private String baseName(String displayName) {
    String lower = displayName.toLowerCase(Locale.ROOT);
    return lower.endsWith(ENGLISH_SUFFIX)
        ? lower.substring(0, lower.length() - ENGLISH_SUFFIX.length())
        : lower;
  }

  private String humanizar(String slug) {
    StringBuilder sb = new StringBuilder();
    for (String parte : slug.split("[-_]+")) {
      if (parte.isBlank()) {
        continue;
      }
      if (sb.length() > 0) {
        sb.append(' ');
      }
      sb.append(Character.toUpperCase(parte.charAt(0))).append(parte.substring(1));
    }
    return sb.toString();
  }
}
```

Nota de arquitetura: `application` referenciando `infrastructure.markdown.CaseFrontmatterParser` segue o precedente do projeto (`GerarSitemapUseCase` importa `infrastructure.config.*`). Não criar port novo para isso (YAGNI).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn test -Dtest=ListarCasesUseCaseTest`
Expected: `Tests run: 5, Failures: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wmakeouthill/portfolio/application/dto/CaseDto.java backend/src/main/java/com/wmakeouthill/portfolio/application/usecase/ListarCasesUseCase.java backend/src/test/java/com/wmakeouthill/portfolio/application/usecase/ListarCasesUseCaseTest.java
git commit -m "feat(backend): listagem de cases profissionais como cards (CaseDto)"
```

### Tarefa 8: Endpoint GET /api/content/cases

**Executor sugerido:** Sonnet 5.

**Files:**
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/web/PortfolioContentController.java`
- Test: `backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/web/PortfolioContentControllerCasesTest.java`

**Interfaces:**
- Consumes: `ListarCasesUseCase.executar(String)` (Tarefa 7).
- Produces: `GET /api/content/cases?lang=pt|en` → JSON `[CaseDto...]`, Cache-Control 5 min public. Frontend (Tarefa 12) consome esta URL.

- [ ] **Step 1: Escrever o teste que falha**

```java
package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.CaseDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.application.usecase.ListarCasesUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PortfolioContentControllerCasesTest {

  private final GithubRepositoryContentPort contentPort = mock(GithubRepositoryContentPort.class);
  private final ListarCasesUseCase listarCasesUseCase = mock(ListarCasesUseCase.class);
  private final MockMvc mvc = MockMvcBuilders
      .standaloneSetup(new PortfolioContentController(contentPort, listarCasesUseCase))
      .build();

  @Test
  void listarCases_semLang_deveUsarPtEExporJson() throws Exception {
    when(listarCasesUseCase.executar("pt")).thenReturn(List.of(new CaseDto(
        "mercearia-rv", "Mercearia R&V", "Mercearia R&V", "freela", "Produção",
        List.of("Java 21"), null, null, true, "mercearia-r-v", 9)));

    mvc.perform(get("/api/content/cases"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "max-age=300, public"))
        .andExpect(jsonPath("$[0].slug").value("mercearia-rv"))
        .andExpect(jsonPath("$[0].hasGallery").value(true));
  }

  @Test
  void listarCases_comLangEn_deveRepassarIdioma() throws Exception {
    when(listarCasesUseCase.executar("en")).thenReturn(List.of());

    mvc.perform(get("/api/content/cases").param("lang", "en"))
        .andExpect(status().isOk());
  }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn test -Dtest=PortfolioContentControllerCasesTest`
Expected: FALHA de compilação (construtor do controller não aceita `ListarCasesUseCase`).

- [ ] **Step 3: Implementar**

Em `PortfolioContentController.java`:
1. Novo campo (o `@RequiredArgsConstructor` já gera o construtor de 2 args):
```java
  private final com.wmakeouthill.portfolio.application.usecase.ListarCasesUseCase listarCasesUseCase;
```
(preferir import normal `import com.wmakeouthill.portfolio.application.usecase.ListarCasesUseCase;` + campo `private final ListarCasesUseCase listarCasesUseCase;`)

2. Novo endpoint, na seção DOCUMENTAÇÕES (após `/docs/trabalhos`):
```java
  /**
   * Lista os cases profissionais (aba Profissionais) como cards.
   */
  @GetMapping("/cases")
  public ResponseEntity<List<com.wmakeouthill.portfolio.application.dto.CaseDto>> listarCases(
      @RequestParam(name = "lang", defaultValue = "pt") String lang) {
    log.info("Listando cases profissionais (lang={})", lang);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
        .body(listarCasesUseCase.executar(lang));
  }
```
(idem: usar import de `CaseDto` no topo em vez do FQN.)

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn test -Dtest=PortfolioContentControllerCasesTest`
Expected: `Tests run: 2, Failures: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/web/PortfolioContentController.java backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/web/PortfolioContentControllerCasesTest.java
git commit -m "feat(backend): endpoint GET /api/content/cases"
```

### Tarefa 9: Cases no RAG e no pipeline de markdown por slug

**Executor sugerido:** Opus/Fable (integra RAG, idioma e leitura por slug; regressão aqui afeta o chat inteiro).

**Files:**
- Create: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/content/CaseMarkdownSupport.java`
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/content/GithubPortfolioMarkdownAdapter.java`
- Test: `backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/content/GithubPortfolioMarkdownAdapterCasesTest.java`

**Interfaces:**
- Consumes: `listarDocumentacoesCases()` (Tarefa 6), `CaseFrontmatterParser` (Tarefa 5).
- Produces:
  - `carregarMarkdownsDetalhados(lang)` passa a incluir cases como `PortfolioMarkdownResource(projeto=true)` com corpo SEM frontmatter e tags de client/category/stack — `ContextSearchService` (tag boost) e `ProjetoKeywordDetector` (dinâmico sobre `projeto=true` / `listarNomesProjetosComMarkdown`) pegam os cases automaticamente, sem mudança neles.
  - `carregarMarkdownPorProjeto(slug, lang)` resolve slugs de case (corpo sem frontmatter) — com isso o readme-modal, `/api/projects/:slug/markdown[/html]` e a página SSR `/projects/:slug`→`/cases/:slug` funcionam para cases sem endpoint novo.
  - `listarNomesProjetosComMarkdown()` inclui os slugs de cases.
  - `CaseMarkdownSupport.removerFrontmatter(String)` e `CaseMarkdownSupport.converter(RepositoryFileDto, String conteudo, String nomeBase, int maxChars)` → `Optional<PortfolioMarkdownResource>`.

- [ ] **Step 1: Escrever o teste que falha**

```java
package com.wmakeouthill.portfolio.infrastructure.content;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GithubPortfolioMarkdownAdapterCasesTest {

  private static final String CASE_PATH = "portfolio-content/cases/freelas/mercearia-rv.md";
  private static final String CASE_MD = """
      ---
      title: Mercearia R&V — PDV desktop offline-first
      client: Mercearia R&V
      category: freela
      status: Produção
      stack: [Java 21, Electron]
      order: 9
      ---
      # Case — Mercearia R&V

      Corpo do case.
      """;

  private final GithubRepositoryContentPort port = mock(GithubRepositoryContentPort.class);
  private final GithubPortfolioMarkdownAdapter adapter = new GithubPortfolioMarkdownAdapter(
      port, new CaseMarkdownSupport(new CaseFrontmatterParser()));

  @Test
  void carregarMarkdownsDetalhados_deveIncluirCaseComoProjetoComTagsESemFrontmatter() {
    when(port.listarDocumentacoes()).thenReturn(List.of());
    when(port.listarDocumentacoesProjetos()).thenReturn(List.of());
    when(port.listarDocumentacoesTrabalhos()).thenReturn(List.of());
    when(port.listarDocumentacoesCases()).thenReturn(List.of(md("mercearia-rv", CASE_PATH)));
    when(port.obterMarkdownConteudo(CASE_PATH)).thenReturn(Optional.of(CASE_MD));

    List<PortfolioMarkdownResource> recursos = adapter.carregarMarkdownsDetalhados("pt");

    assertThat(recursos).hasSize(1);
    PortfolioMarkdownResource recurso = recursos.get(0);
    assertThat(recurso.projeto()).isTrue();
    assertThat(recurso.conteudo()).startsWith("# Case — Mercearia R&V");
    assertThat(recurso.conteudo()).doesNotContain("title:");
    assertThat(recurso.tags()).contains("case", "freela", "mercearia r&v", "java 21", "mercearia");
  }

  @Test
  void carregarMarkdownPorProjeto_deveResolverSlugDeCaseSemFrontmatter() {
    when(port.listarDocumentacoesProjetos()).thenReturn(List.of());
    when(port.listarDocumentacoesTrabalhos()).thenReturn(List.of());
    when(port.listarDocumentacoesCases()).thenReturn(List.of(md("mercearia-rv", CASE_PATH)));
    when(port.obterMarkdownConteudo(CASE_PATH)).thenReturn(Optional.of(CASE_MD));

    Optional<String> conteudo = adapter.carregarMarkdownPorProjeto("mercearia-rv", "pt");

    assertThat(conteudo).isPresent();
    assertThat(conteudo.get()).startsWith("# Case — Mercearia R&V");
    assertThat(conteudo.get()).doesNotContain("---");
  }

  @Test
  void listarNomesProjetosComMarkdown_deveIncluirCases() {
    when(port.listarDocumentacoesProjetos()).thenReturn(List.of());
    when(port.listarDocumentacoesTrabalhos()).thenReturn(List.of());
    when(port.listarDocumentacoesCases()).thenReturn(List.of(md("mercearia-rv", CASE_PATH)));

    assertThat(adapter.listarNomesProjetosComMarkdown()).contains("mercearia-rv");
  }

  private RepositoryFileDto md(String nome, String path) {
    return new RepositoryFileDto(nome + ".md", nome, path,
        "https://raw.example/" + path, "https://github.example/" + path, 10L, "sha-" + nome, "file");
  }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn test -Dtest=GithubPortfolioMarkdownAdapterCasesTest`
Expected: FALHA de compilação (`CaseMarkdownSupport` não existe; construtor do adapter tem 1 arg).

- [ ] **Step 3: Implementar `CaseMarkdownSupport`**

```java
package com.wmakeouthill.portfolio.infrastructure.content;

import com.wmakeouthill.portfolio.application.dto.RepositoryFileDto;
import com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatter;
import com.wmakeouthill.portfolio.infrastructure.markdown.CaseFrontmatterParser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Converte cases profissionais (markdown com frontmatter) em recursos de RAG:
 * corpo sem o bloco YAML e tags derivadas de client/category/stack para o tag
 * boost do ContextSearchService (ex.: "projeto da Libbs" acha o case da LIS).
 */
@Component
@RequiredArgsConstructor
public class CaseMarkdownSupport {

  private final CaseFrontmatterParser parser;

  public Optional<PortfolioMarkdownResource> converter(
      RepositoryFileDto doc, String conteudo, String nomeBase, int maxChars) {
    if (conteudo == null || conteudo.isBlank()) {
      return Optional.empty();
    }
    CaseFrontmatter fm = parser.extrair(conteudo);
    String corpo = fm.corpo();
    if (corpo.isBlank()) {
      return Optional.empty();
    }
    String limitado = corpo.length() > maxChars ? corpo.substring(0, maxChars) : corpo;
    return Optional.of(new PortfolioMarkdownResource(
        nomeBase, doc.path(), limitado, true, false, tagsDe(fm, nomeBase, doc.path())));
  }

  public String removerFrontmatter(String conteudo) {
    return parser.extrair(conteudo).corpo();
  }

  /** Caminhos diretos possíveis de um case, para o fallback por path do adapter. */
  public List<String> caminhosDiretos(String nomeNormalizado, boolean english) {
    String sufixo = english ? "-english" : "";
    return List.of(
        "portfolio-content/cases/freelas/" + nomeNormalizado + sufixo + ".md",
        "portfolio-content/cases/autou/" + nomeNormalizado + sufixo + ".md");
  }

  private Set<String> tagsDe(CaseFrontmatter fm, String nomeBase, String path) {
    Set<String> tags = new HashSet<>();
    tags.add("projeto");
    tags.add("case");
    tags.add("profissional");
    tags.add(nomeBase);
    tags.add(nomeBase.replace("-", " ").replace("_", " "));
    for (String parte : nomeBase.split("[-_]+")) {
      if (parte.length() > 2) {
        tags.add(parte.toLowerCase(Locale.ROOT));
      }
    }
    String categoria = fm.category() != null ? fm.category()
        : (path.contains("/autou/") ? "autou" : "freela");
    tags.add(categoria);
    if ("freela".equals(categoria)) {
      tags.add("freelance");
    }
    if (fm.client() != null) {
      String cliente = fm.client().toLowerCase(Locale.ROOT);
      tags.add(cliente);
      for (String parte : cliente.split("[\\s(—–-]+")) {
        if (parte.length() > 2) {
          tags.add(parte);
        }
      }
    }
    for (String tecnologia : fm.stack()) {
      tags.add(tecnologia.toLowerCase(Locale.ROOT));
    }
    return tags;
  }
}
```

- [ ] **Step 4: Integrar no `GithubPortfolioMarkdownAdapter`**

1. Novo campo (junto de `githubContentPort`; `@RequiredArgsConstructor` atualiza o construtor):
```java
  private final CaseMarkdownSupport caseMarkdownSupport;
```

2. Em `carregarMarkdownsDetalhados(String language)`, após o loop de trabalhos e antes do `log.info`:
```java
    // Carrega cases profissionais (frontmatter vira tags; corpo sem o bloco YAML)
    for (RepositoryFileDto doc : filtrarPorIdioma(githubContentPort.listarDocumentacoesCases(), english)) {
      githubContentPort.obterMarkdownConteudo(doc.path())
          .flatMap(conteudo -> caseMarkdownSupport.converter(
              doc, conteudo, baseName(doc.displayName()), MAX_CHARS_PER_FILE))
          .ifPresent(recursos::add);
    }
```

3. Em `buscarMarkdownNaLista(...)`, após o loop "Busca em trabalhos" e antes do `log.debug("Não encontrado...")`:
```java
    // Busca em cases profissionais (devolve corpo sem frontmatter)
    for (RepositoryFileDto doc : filtrarPorIdioma(githubContentPort.listarDocumentacoesCases(), english)) {
      if (baseName(doc.displayName()).equals(nomeNormalizado)) {
        log.debug("Encontrado em cases: {} -> {}", nomeProjeto, doc.path());
        return githubContentPort.obterMarkdownConteudo(doc.path())
            .map(caseMarkdownSupport::removerFrontmatter);
      }
    }
```

4. Em `carregarMarkdownPorProjeto(String, String)`, após a tentativa de `pathTrabalho` e antes do fallback EN→PT:
```java
    // Fallback: paths diretos de cases (freelas e autou)
    for (String pathCase : caseMarkdownSupport.caminhosDiretos(nomeProjetoNormalizado, english)) {
      Optional<String> conteudoCase = githubContentPort.obterMarkdownConteudo(pathCase)
          .map(caseMarkdownSupport::removerFrontmatter);
      if (conteudoCase.isPresent()) {
        return conteudoCase;
      }
    }
```

5. Em `listarNomesProjetosComMarkdown()`, antes do `return`:
```java
    for (RepositoryFileDto doc : githubContentPort.listarDocumentacoesCases()) {
      nomes.add(baseName(doc.displayName()));
    }
```

Se o arquivo passar de ~300 linhas, mover mais lógica para `CaseMarkdownSupport` (nunca duplicar).

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && mvn test -Dtest=GithubPortfolioMarkdownAdapterCasesTest`
Expected: `Tests run: 3, Failures: 0`

- [ ] **Step 6: Suíte inteira**

Run: `cd backend && mvn test`
Expected: BUILD SUCCESS (nenhuma regressão em splitter/render/etc.)

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/content/CaseMarkdownSupport.java backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/content/GithubPortfolioMarkdownAdapter.java backend/src/test/java/com/wmakeouthill/portfolio/infrastructure/content/GithubPortfolioMarkdownAdapterCasesTest.java
git commit -m "feat(backend): cases profissionais no RAG e no markdown por slug"
```

### Tarefa 10: Nota sobre as abas no prompt do chat

**Executor sugerido:** Sonnet 5.

**Files:**
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/domain/service/PortfolioPromptService.java`

- [ ] **Step 1: Adicionar o bloco PT**

Em `BASE_SYSTEM_PROMPT` (text block iniciado na linha ~24), adicionar ao FINAL do text block (antes do `"""` de fechamento):

```text
Organização dos projetos no site:
- A seção Projetos tem duas abas: "Profissionais" (cases de freelance e da AutoU — ex.: Sol, AOG/Dux, Mercearia R&V, Experimenta AI, JGV, Pulse, Saint-Gobain, Colibri/Oxiquímica, Rocester, Aura Central) e "Pessoais" (repositórios públicos do GitHub).
- Para perguntas sobre experiência profissional, clientes ou cases, use os documentos de case e indique a aba "Profissionais" da seção de Projetos.
- LIS (Libbs) e a demo do Itaú foram demonstrações técnicas — nunca as apresente como clientes em produção.
```

- [ ] **Step 2: Adicionar o bloco EN**

Em `BASE_SYSTEM_PROMPT_EN` (linha ~168), idem ao final do text block:

```text
How projects are organized on the site:
- The Projects section has two tabs: "Professional" (freelance and AutoU cases — e.g. Sol, AOG/Dux, Mercearia R&V, Experimenta AI, JGV, Pulse, Saint-Gobain, Colibri/Oxiquimica, Rocester, Aura Central) and "Personal" (public GitHub repositories).
- For questions about professional experience, clients or cases, use the case documents and point to the "Professional" tab of the Projects section.
- LIS (Libbs) and the Itau demo were technical demos — never present them as production clients.
```

- [ ] **Step 3: Compilar + suíte**

Run: `cd backend && mvn test`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/wmakeouthill/portfolio/domain/service/PortfolioPromptService.java
git commit -m "feat(chat): prompt distingue abas Profissionais (cases) e Pessoais"
```

### Tarefa 11: SEO/SSR backend — sitemap, tags de cache, rotas /cases e warmup

**Executor sugerido:** Opus/Fable (toca sitemap, edge cache e warmup de produção).

**Files:**
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/application/seo/GerarSitemapUseCase.java`
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/application/usecase/RenderizarPaginaPublicaUseCase.java` (método `tagsDe`)
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/web/PublicPageController.java`
- Modify: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/warmup/EdgeCacheWarmupScheduler.java`
- Test: `backend/src/test/java/com/wmakeouthill/portfolio/application/seo/SeoSitemapTest.java` (novo método)

**Interfaces:**
- Consumes: `PortfolioMarkdownResource.caminho()` — cases têm caminho contendo `/cases/` (Tarefa 9 os injeta em `carregarMarkdownsDetalhados`).
- Produces: sitemap e `rotasPublicas()` com `/cases/<slug>` (e NÃO `/projects/<slug>` para cases); SSR edge servindo `/cases/**` e `/en/cases/**`; cache tag `case:<slug>`; warmup pingando `/api/content/cases?lang=pt|en`.

- [ ] **Step 1: Escrever o teste que falha** — adicionar a `SeoSitemapTest.java`:

```java
  @Test
  void sitemap_deveListarCasesEmRotaPropriaENaoComoProjeto() {
    PortfolioContentPort conteudo = mock(PortfolioContentPort.class);
    when(conteudo.carregarMarkdownsDetalhados("pt")).thenReturn(List.of(
        markdown("aa-space"),
        caseMarkdown("mercearia-rv")));
    when(conteudo.carregarMarkdownsDetalhados("en")).thenReturn(List.of(
        caseMarkdown("mercearia-rv-english")));
    GerarSitemapUseCase uc = new GerarSitemapUseCase(conteudo, site);

    String xml = uc.gerarSitemap();

    assertThat(xml).contains("<loc>https://meu-site.dev/cases/mercearia-rv</loc>");
    assertThat(xml).contains("<loc>https://meu-site.dev/en/cases/mercearia-rv</loc>");
    assertThat(xml).contains("<loc>https://meu-site.dev/projects/aa-space</loc>");
    assertThat(xml).doesNotContain("/projects/mercearia-rv");
    assertThat(uc.rotasPublicas()).contains("/cases/mercearia-rv");
  }

  private PortfolioMarkdownResource caseMarkdown(String nome) {
    return new PortfolioMarkdownResource(nome,
        "portfolio-content/cases/freelas/" + nome + ".md", "# " + nome, true, false, Set.of());
  }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn test -Dtest=SeoSitemapTest`
Expected: FAIL (`/cases/mercearia-rv` ausente; hoje o case sairia como `/projects/mercearia-rv`).

- [ ] **Step 3: Implementar no `GerarSitemapUseCase`**

Substituir `slugsMarkdownPublicos()` por versão parametrizada e usar nos dois pontos:

```java
  @Cacheable(cacheNames = CaffeineCacheConfig.CACHE_GITHUB_DATA, key = "'sitemap'")
  public String gerarSitemap() {
    StringBuilder sb = new StringBuilder(2048);
    sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" ");
    sb.append("xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n");

    adicionarUrl(sb, "/");
    adicionarUrl(sb, "/projects");
    for (String slug : slugsMarkdownPublicos(false)) {
      adicionarUrl(sb, "/projects/" + slug);
    }
    for (String slug : slugsMarkdownPublicos(true)) {
      adicionarUrl(sb, "/cases/" + slug);
    }

    sb.append("</urlset>\n");
    return sb.toString();
  }

  public List<String> rotasPublicas() {
    var rotas = new java.util.ArrayList<String>();
    rotas.add("/");
    rotas.add("/projects");
    for (String slug : slugsMarkdownPublicos(false)) {
      rotas.add("/projects/" + slug);
    }
    for (String slug : slugsMarkdownPublicos(true)) {
      rotas.add("/cases/" + slug);
    }
    return rotas;
  }

  /**
   * Slugs de markdowns projeto=true, separados por tipo: cases (caminho com
   * /cases/) viram /cases/<slug>; o resto continua em /projects/<slug>.
   */
  private Set<String> slugsMarkdownPublicos(boolean cases) {
    Set<String> slugs = new LinkedHashSet<>();
    for (String lang : List.of("pt", "en")) {
      portfolioContentPort.carregarMarkdownsDetalhados(lang).stream()
          .filter(recurso -> recurso.projeto() && recurso.nome() != null && !recurso.nome().isBlank())
          .filter(recurso -> cases == ehCase(recurso))
          .map(recurso -> recurso.nome().toLowerCase())
          .map(nome -> nome.replaceFirst("-english$", ""))
          .forEach(slugs::add);
    }
    return slugs;
  }

  private boolean ehCase(com.wmakeouthill.portfolio.domain.model.PortfolioMarkdownResource recurso) {
    return recurso.caminho() != null && recurso.caminho().contains("/cases/");
  }
```
(usar import normal de `PortfolioMarkdownResource` no topo.)

- [ ] **Step 4: `tagsDe` no `RenderizarPaginaPublicaUseCase`**

Adicionar o branch de cases logo após a normalização de `semIdioma` (antes do branch `/projects/`):
```java
    if (semIdioma.startsWith("/cases/")) {
      String slug = semIdioma.substring("/cases/".length()).toLowerCase();
      if (!slug.isBlank()) {
        return Set.of("case:" + slug);
      }
    }
```

- [ ] **Step 5: Rotas SSR no `PublicPageController`**

Trocar o array do `@GetMapping` por:
```java
  @GetMapping(value = {
      "/", "/projects", "/projects/**", "/cases/**",
      "/en", "/en/projects", "/en/projects/**", "/en/cases/**"
  }, produces = MediaType.TEXT_HTML_VALUE)
```
(`/cases` sem slug não existe como página — cai no SpaController e o Angular redireciona para a home; não mapear.)

- [ ] **Step 6: Warmup do endpoint de cases no `EdgeCacheWarmupScheduler`**

Em `aquecerEdge()`, trocar `List<String> rotas = rotas();` por:
```java
    List<String> rotas = new ArrayList<>(rotas());
    // Aquece o JSON de cases nos dois idiomas (alimenta a vitrine da aba Profissionais)
    rotas.add("/api/content/cases?lang=pt");
    rotas.add("/api/content/cases?lang=en");
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd backend && mvn test`
Expected: BUILD SUCCESS, incluindo o novo teste do sitemap.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/wmakeouthill/portfolio/application/seo/GerarSitemapUseCase.java backend/src/main/java/com/wmakeouthill/portfolio/application/usecase/RenderizarPaginaPublicaUseCase.java backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/web/PublicPageController.java backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/warmup/EdgeCacheWarmupScheduler.java backend/src/test/java/com/wmakeouthill/portfolio/application/seo/SeoSitemapTest.java
git commit -m "feat(seo): rotas /cases/:slug no sitemap, SSR edge e warmup"
```

### Tarefa 12: Frontend base — modelo, serviço, rotas, SEO e i18n

**Executor sugerido:** Sonnet 5.

**Files:**
- Modify: `frontend/src/app/models/interfaces.ts` (adicionar `CaseItem` ao final)
- Create: `frontend/src/app/services/cases.service.ts`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/services/seo.service.ts`
- Modify: `frontend/src/assets/i18n/pt.json` e `frontend/src/assets/i18n/en.json`

**Interfaces:**
- Consumes: `GET /api/content/cases?lang=` (Tarefa 8); `resolveApiUrl` (`../utils/api-url.util`); `Language` (`../i18n/i18n.service`).
- Produces: `CaseItem` (espelho exato do `CaseDto` JSON) e `CasesService.getCases(lang): Observable<CaseItem[]>` com cache por idioma — Tarefas 13/14 consomem. Rotas `cases/:slug` reusam `ProjectDetailComponent` (ele busca `/api/projects/:slug/markdown/html`, que resolve cases após a Tarefa 9).

- [ ] **Step 1: `CaseItem` em `models/interfaces.ts`** (ao final do arquivo)

```typescript
/** Case profissional (aba Profissionais) — espelho do CaseDto do backend. */
export interface CaseItem {
  slug: string;
  title: string;
  client: string | null;
  category: 'freela' | 'autou';
  status: string | null;
  stack: string[];
  coverUrl: string | null;
  logoUrl: string | null;
  hasGallery: boolean;
  gallerySlug: string;
  order: number | null;
}
```

- [ ] **Step 2: `cases.service.ts`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';

import { CaseItem } from '../models/interfaces';
import { resolveApiUrl } from '../utils/api-url.util';
import type { Language } from '../i18n/i18n.service';

/**
 * Carrega os cases profissionais do backend (que os cacheia via Caffeine).
 * Cache em memória por idioma: trocar de aba não refaz a requisição.
 */
@Injectable({ providedIn: 'root' })
export class CasesService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<Language, Observable<CaseItem[]>>();

  getCases(lang: Language): Observable<CaseItem[]> {
    let cases$ = this.cache.get(lang);
    if (!cases$) {
      const url = resolveApiUrl(`/api/content/cases?lang=${lang}`);
      cases$ = this.http.get<CaseItem[]>(url).pipe(
        catchError(() => {
          this.cache.delete(lang);
          return of([]);
        }),
        shareReplay(1)
      );
      this.cache.set(lang, cases$);
    }
    return cases$;
  }
}
```

- [ ] **Step 3: Rotas em `app.routes.ts`** — adicionar antes do wildcard:

```typescript
  { path: 'cases/:slug', loadComponent: projectDetail },
  { path: 'en/cases/:slug', loadComponent: projectDetail },
```
(inserir logo após as rotas `projects/:slug` correspondentes, mantendo o `'**'` por último.)

- [ ] **Step 4: SEO em `seo.service.ts`**

Em `metadadosDe(...)`, adicionar ANTES do bloco `if (ptPath.startsWith('/projects/'))`:
```typescript
    if (ptPath.startsWith('/cases/')) {
      const slug = ptPath.substring('/cases/'.length);
      return {
        title: `${this.titulizar(slug)} — Case — Wesley de Carvalho`,
        description: conjunto.projects.description
      };
    }
```

Em `definirJsonLd(...)`, trocar o ternário por:
```typescript
  private definirJsonLd(ptPath: string, idioma: Language): void {
    let grafo: unknown;
    if (ptPath.startsWith('/cases/')) {
      grafo = this.jsonLdCase(ptPath, idioma);
    } else if (ptPath.startsWith('/projects/')) {
      grafo = this.jsonLdProjeto(ptPath, idioma);
    } else {
      grafo = this.jsonLdPessoa();
    }
    this.upsertJsonLd(JSON.stringify(grafo));
  }
```

Novo método (após `jsonLdProjeto`):
```typescript
  /** Case profissional: CreativeWork (sem codeRepository — repositório privado/cliente). */
  private jsonLdCase(ptPath: string, idioma: Language): unknown {
    const slug = ptPath.substring('/cases/'.length);
    const nome = this.titulizar(slug);
    const url = this.urlAbsoluta(this.caminhoPara(ptPath, idioma));
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: idioma === 'en' ? 'Home' : 'Início', item: this.urlAbsoluta(this.caminhoPara('/', idioma)) },
            { '@type': 'ListItem', position: 2, name: nome, item: url }
          ]
        },
        {
          '@type': 'CreativeWork',
          name: nome,
          url,
          author: { '@type': 'Person', name: 'Wesley de Carvalho Augusto Correia' }
        }
      ]
    };
  }
```

- [ ] **Step 5: i18n**

Em `pt.json`, dentro do objeto `"projects"`, adicionar:
```json
    "tabs": { "professional": "Profissionais", "personal": "Pessoais" },
    "caseFilters": { "all": "Todos", "freela": "Freelance", "autou": "AutoU" },
    "case": {
      "readCase": "Ler case completo",
      "gallery": "Galeria",
      "demoBadge": "Demo",
      "loading": "Carregando cases...",
      "empty": "Nenhum case encontrado."
    }
```

Em `en.json`, idem:
```json
    "tabs": { "professional": "Professional", "personal": "Personal" },
    "caseFilters": { "all": "All", "freela": "Freelance", "autou": "AutoU" },
    "case": {
      "readCase": "Read full case",
      "gallery": "Gallery",
      "demoBadge": "Demo",
      "loading": "Loading cases...",
      "empty": "No cases found."
    }
```

- [ ] **Step 6: Build**

Run: `cd frontend && npm run build`
Expected: build sem erros.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/models/interfaces.ts frontend/src/app/services/cases.service.ts frontend/src/app/app.routes.ts frontend/src/app/services/seo.service.ts frontend/src/assets/i18n/pt.json frontend/src/assets/i18n/en.json
git commit -m "feat(front): base dos cases — modelo, serviço, rotas /cases e i18n"
```

### Tarefa 13: Abas + grid profissional (case-card) + modais

**Executor sugerido:** Opus/Fable. Visual: seguir o design system atual (`.proj-card`, `.filter-btn`, `.pagination` em `projects.component.css`) — usar a skill **impeccable/frontend-design** para os componentes novos.

**Files:**
- Create: `frontend/src/app/components/projects/case-card/case-card.component.ts` (+ `.html`, `.css`)
- Create: `frontend/src/app/components/projects/professional-cases/professional-cases.component.ts` (+ `.html`, `.css`)
- Modify: `frontend/src/app/components/projects/projects.component.ts`
- Modify: `frontend/src/app/components/projects/projects.component.html`

**Interfaces:**
- Consumes: `CasesService.getCases(lang)`, `CaseItem` (Tarefa 12); `I18nService.language()`; modais existentes do `projects.component` (readme-modal recebe `projectName` = slug do case; demo-modal com `initialView='gallery'` e `projectName` = `gallerySlug`).
- Produces:
  - `CaseCardComponent`: `case = input.required<CaseItem>()`; outputs `readCase = output<string>()` (slug) e `openGallery = output<CaseItem>()`. Link "Ler case completo" é um `<a>` com href real (`/cases/:slug` ou `/en/cases/:slug`) que em clique simples faz `preventDefault()` e emite `readCase` (ctrl/meta/shift/botão do meio deixam navegar — mesmo padrão de `openReadmeFromLink`).
  - `ProfessionalCasesComponent` (`selector: 'app-professional-cases'`): outputs `readCase = output<string>()` e `openGallery = output<CaseItem>()`; internamente carrega cases, filtro `'all' | 'freela' | 'autou'`, paginação por linhas cheias (mesmo padrão medido do grid pessoal), e reserva o topo para a vitrine (Tarefa 14).
  - `projects.component`: signal `activeTab = signal<'professional' | 'personal'>('professional')` e handlers `openCaseReadme(slug: string)` / `openCaseGallery(caseItem: CaseItem)` — a Tarefa 14 também usa esses handlers.

- [ ] **Step 1: `case-card.component.ts`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CaseItem } from '../../../models/interfaces';
import { TranslatePipe } from '../../../i18n/i18n.pipe';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Card de case profissional no grid da aba Profissionais.
 * Fallbacks: sem cover → painel gradiente; sem client → chip oculto;
 * sem galeria → botão de galeria oculto.
 */
@Component({
  selector: 'app-case-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './case-card.component.html',
  styleUrl: './case-card.component.css'
})
export class CaseCardComponent {
  private readonly i18n = inject(I18nService);

  readonly case = input.required<CaseItem>();
  readonly readCase = output<string>();
  readonly openGallery = output<CaseItem>();

  /** URL real da página SSR do case, por idioma (rastreável pelo bot). */
  readonly caseHref = computed(() => {
    const slug = this.case().slug;
    return this.i18n.language() === 'en' ? `/en/cases/${slug}` : `/cases/${slug}`;
  });

  readonly isDemo = computed(() => (this.case().status ?? '').toLowerCase().includes('demo'));

  onReadCase(event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      return;
    }
    event.preventDefault();
    this.readCase.emit(this.case().slug);
  }
}
```

- [ ] **Step 2: `case-card.component.html`**

```html
<article class="case-card reveal">
  <div class="case-cover">
    @if (case().coverUrl) {
      <img [src]="case().coverUrl" [alt]="case().title" loading="lazy" decoding="async" />
    } @else {
      <div class="case-cover-fallback" aria-hidden="true">
        <span>{{ case().client || case().title }}</span>
      </div>
    }
    @if (isDemo()) {
      <span class="case-demo-badge">{{ 'projects.case.demoBadge' | translate }}</span>
    }
  </div>

  <div class="case-body">
    <div class="case-meta-row">
      @if (case().client) {
        <span class="case-client">{{ case().client }}</span>
      }
      @if (case().status) {
        <span class="case-status">{{ case().status }}</span>
      }
    </div>
    <h3 class="case-title">{{ case().title }}</h3>

    @if (case().stack.length > 0) {
      <div class="case-stack">
        @for (tech of case().stack.slice(0, 5); track tech) {
          <span>{{ tech }}</span>
        }
      </div>
    }

    <div class="case-actions">
      <a class="case-link" [href]="caseHref()" (click)="onReadCase($event)">
        {{ 'projects.case.readCase' | translate }}
      </a>
      @if (case().hasGallery) {
        <button type="button" class="case-gallery-btn" (click)="openGallery.emit(case())">
          {{ 'projects.case.gallery' | translate }}
        </button>
      }
    </div>
  </div>
</article>
```

- [ ] **Step 3: `case-card.component.css`** — estilizar com a skill impeccable, coerente com `.proj-card` (mesma paleta/rádios/hover do design system). Obrigatório: `.case-cover-fallback` = painel gradiente com o texto centralizado; `.case-cover img { width: 100%; object-fit: cover; }`; card inteiro com hover elevando como os cards pessoais.

- [ ] **Step 4: `professional-cases.component.ts`**

```typescript
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, output, signal, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CaseItem } from '../../../models/interfaces';
import { CasesService } from '../../../services/cases.service';
import { TranslatePipe } from '../../../i18n/i18n.pipe';
import { I18nService } from '../../../i18n/i18n.service';
import { CaseCardComponent } from '../case-card/case-card.component';

type CaseFilter = 'all' | 'freela' | 'autou';

/**
 * Aba Profissionais: vitrine (topo) + grid de cases com filtro
 * Todos/Freelance/AutoU e paginação por linhas cheias (colunas medidas).
 */
@Component({
  selector: 'app-professional-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe, CaseCardComponent],
  templateUrl: './professional-cases.component.html',
  styleUrl: './professional-cases.component.css'
})
export class ProfessionalCasesComponent implements OnInit, OnDestroy {
  private readonly casesService = inject(CasesService);
  private readonly i18n = inject(I18nService);

  readonly readCase = output<string>();
  readonly openGallery = output<CaseItem>();

  readonly casesGrid = viewChild<ElementRef<HTMLElement>>('casesGrid');

  readonly cases = signal<CaseItem[]>([]);
  readonly loading = signal<boolean>(true);
  readonly filter = signal<CaseFilter>('all');
  readonly currentPage = signal<number>(1);

  private readonly gridColumns = signal<number>(3);
  private readonly rowsPerPage = 2;
  readonly itemsPerPage = computed(() => Math.max(1, this.gridColumns()) * this.rowsPerPage);

  private gridResizeObserver?: ResizeObserver;
  private lastLanguage = this.i18n.language();

  private readonly reloadOnLangChange = effect(() => {
    const lang = this.i18n.language();
    if (lang !== this.lastLanguage) {
      this.lastLanguage = lang;
      this.loadCases();
    }
  });

  private readonly measureGridColumns = effect((onCleanup) => {
    if (typeof window === 'undefined') {
      return;
    }
    const gridRef = this.casesGrid();
    this.gridResizeObserver?.disconnect();
    if (!gridRef?.nativeElement) {
      return;
    }
    const el = gridRef.nativeElement;
    const update = () => {
      const template = getComputedStyle(el).gridTemplateColumns;
      const cols = template.split(' ').filter(t => t && t !== 'none').length;
      if (cols > 0) {
        this.gridColumns.set(cols);
      }
    };
    update();
    this.gridResizeObserver = new ResizeObserver(update);
    this.gridResizeObserver.observe(el);
    onCleanup(() => this.gridResizeObserver?.disconnect());
  });

  private readonly clampCurrentPage = effect(() => {
    const total = this.totalPages();
    if (untracked(() => this.currentPage()) > total) {
      this.currentPage.set(Math.max(1, total));
    }
  });

  readonly filteredCases = computed(() => {
    const filter = this.filter();
    const all = this.cases();
    return filter === 'all' ? all : all.filter(c => c.category === filter);
  });

  readonly paginatedCases = computed(() => {
    const perPage = this.itemsPerPage();
    const start = (this.currentPage() - 1) * perPage;
    return this.filteredCases().slice(start, start + perPage);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCases().length / this.itemsPerPage())));

  ngOnInit(): void {
    this.loadCases();
  }

  ngOnDestroy(): void {
    this.gridResizeObserver?.disconnect();
  }

  setFilter(filter: CaseFilter): void {
    this.filter.set(filter);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  private loadCases(): void {
    this.loading.set(true);
    this.casesService.getCases(this.i18n.language()).subscribe(cases => {
      this.cases.set(cases);
      this.loading.set(false);
    });
  }
}
```

- [ ] **Step 5: `professional-cases.component.html`**

```html
<div class="professional-cases">
  <!-- Vitrine entra aqui na Tarefa 14 (app-professional-showcase) -->

  <div class="filters case-filters">
    <button class="filter-btn" [class.active]="filter() === 'all'" (click)="setFilter('all')">
      {{ 'projects.caseFilters.all' | translate }}
    </button>
    <button class="filter-btn" [class.active]="filter() === 'freela'" (click)="setFilter('freela')">
      {{ 'projects.caseFilters.freela' | translate }}
    </button>
    <button class="filter-btn" [class.active]="filter() === 'autou'" (click)="setFilter('autou')">
      {{ 'projects.caseFilters.autou' | translate }}
    </button>
  </div>

  @if (loading()) {
    <div class="loading-container">
      <div class="spinner"></div>
      <p>{{ 'projects.case.loading' | translate }}</p>
    </div>
  }

  @if (!loading() && filteredCases().length > 0) {
    <div class="cases-grid" #casesGrid>
      @for (caseItem of paginatedCases(); track caseItem.slug) {
        <app-case-card [case]="caseItem"
          (readCase)="readCase.emit($event)"
          (openGallery)="openGallery.emit($event)" />
      }
    </div>

    @if (totalPages() > 1) {
      <div class="pagination cert-pagination">
        <button class="pagination-btn pg-arrow" [class.disabled]="currentPage() === 1"
          (click)="goToPage(currentPage() - 1)" aria-label="{{ 'projects.pagination.previous' | translate }}">‹</button>
        @for (page of [].constructor(totalPages()); track $index) {
          <button class="pagination-btn" [class.active]="currentPage() === $index + 1"
            (click)="goToPage($index + 1)">{{ $index + 1 }}</button>
        }
        <button class="pagination-btn pg-arrow" [class.disabled]="currentPage() === totalPages()"
          (click)="goToPage(currentPage() + 1)" aria-label="{{ 'projects.pagination.next' | translate }}">›</button>
      </div>
    }
  }

  @if (!loading() && filteredCases().length === 0) {
    <div class="empty-state">
      <p>{{ 'projects.case.empty' | translate }}</p>
    </div>
  }
</div>
```

Conferir se `projects.pagination.previous/next` existem no `pt.json`; se não existirem, usar `aria-label` fixo `"Anterior"`/`"Próxima"` (e "Previous"/"Next" via chave nova em `projects.case`).

- [ ] **Step 6: `professional-cases.component.css`** — `.cases-grid` com o mesmo `display:grid` responsivo do `.proj-grid`; `.case-filters` reusa o visual dos `.filter-btn` (estilos globais valem se forem globais; senão, replicar tokens). Skill impeccable.

- [ ] **Step 7: Abas no `projects.component`**

Em `projects.component.ts`:
1. Imports: adicionar `ProfessionalCasesComponent` e `CaseItem`:
```typescript
import { ProfessionalCasesComponent } from './professional-cases/professional-cases.component';
import { GitHubRepository, CaseItem } from '../../models/interfaces';
```
2. No decorator, incluir `ProfessionalCasesComponent` no array `imports`.
3. Novos membros:
```typescript
  // Abas: Profissionais (cases) é a default; Pessoais mantém o grid do GitHub
  readonly activeTab = signal<'professional' | 'personal'>('professional');

  selectTab(tab: 'professional' | 'personal'): void {
    this.activeTab.set(tab);
  }

  /** Abre o readme-modal com o markdown do case (sem push de URL na v1). */
  openCaseReadme(slug: string): void {
    this.openReadmeModal(slug);
  }

  /** Abre a galeria do case no demo-modal, usando o slug de galeria (alias). */
  openCaseGallery(caseItem: CaseItem): void {
    this.currentProjectForDemo.set(caseItem.gallerySlug);
    this.currentDemoUrl.set('');
    this.currentDemoInitialView.set('gallery');
    this.showDemoModal.set(true);
  }
```

Em `projects.component.html`:
1. Logo após o `<div class="section-title reveal">...</div>`, inserir:
```html
  <div class="tabs-toggle" role="tablist" aria-label="Tipo de projetos">
    <button class="tab-btn" role="tab" [attr.aria-selected]="activeTab() === 'professional'"
      [class.active]="activeTab() === 'professional'" (click)="selectTab('professional')">
      {{ 'projects.tabs.professional' | translate }}
    </button>
    <button class="tab-btn" role="tab" [attr.aria-selected]="activeTab() === 'personal'"
      [class.active]="activeTab() === 'personal'" (click)="selectTab('personal')">
      {{ 'projects.tabs.personal' | translate }}
    </button>
  </div>

  @if (activeTab() === 'professional') {
    <app-professional-cases
      (readCase)="openCaseReadme($event)"
      (openGallery)="openCaseGallery($event)" />
  }
```
2. Envolver TODO o conteúdo atual da aba pessoal — do `<div class="filters-wrapper">` até o final da paginação/empty-state (exclusive os modais, que ficam fora da section) — em:
```html
  @if (activeTab() === 'personal') {
    ...conteúdo existente sem alterações internas...
  }
```
3. `.tab-btn`/`.tabs-toggle`: estilizar em `projects.component.css` (skill impeccable), destaque claro da aba ativa.

- [ ] **Step 8: Build + smoke**

Run: `cd frontend && npm run build`
Expected: sem erros. Depois `npm start` + abrir `http://localhost:4200`: aba Profissionais default com grid de 19 cases (backend local rodando), filtro Freelance/AutoU funcionando, "Ler case completo" abre o readme-modal com o case SEM frontmatter visível, botão Galeria só em cases com galeria.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/components/projects
git commit -m "feat(front): abas Profissionais/Pessoais com grid de cases"
```

### Tarefa 14: Vitrine auto-rotativa (professional-showcase)

**Executor sugerido:** Opus/Fable **com a skill impeccable/frontend-design** (pedido explícito do Wesley para esta parte).

**Files:**
- Create: `frontend/src/app/components/projects/professional-showcase/professional-showcase.component.ts` (+ `.html`, `.css`)
- Modify: `frontend/src/app/components/projects/professional-cases/professional-cases.component.ts` (+ `.html`) — plugar a vitrine

**Interfaces:**
- Consumes: `CaseItem` (Tarefa 12); lista de cases do `ProfessionalCasesComponent` (Tarefa 13).
- Produces: `ProfessionalShowcaseComponent` com `cases = input.required<CaseItem[]>()` e `readCase = output<string>()` (repassado ao pai, que repassa ao `projects.component`).

**Comportamento obrigatório (referência: Cases.tsx do site AutoU):**
- Faixa de logos/nomes clicáveis acima do card grande: `role="tablist"`, cada item `role="tab"` com `aria-selected`; logo (`logoUrl`) quando existir, senão chip de texto com `client ?? title`.
- Card grande do case ativo: cover (`coverUrl`) ou painel gradiente; título, cliente, status, chips de stack, link real "Ler case completo" (href `/cases/:slug` ou `/en/...`; clique simples abre modal via `readCase`, mesmo padrão da Tarefa 13).
- Auto-rotação a cada **3500 ms**, circular.
- Clique em logo/aba seleciona o case e **pausa a rotação por 15000 ms**.
- Pausa quando a vitrine está fora do viewport (IntersectionObserver) e retoma ao voltar.
- `prefers-reduced-motion: reduce` → sem auto-rotação (navegação manual continua).
- SSR-safe: nenhum `setInterval`/`IntersectionObserver`/`matchMedia` fora de guard de browser; o HTML SSR mostra o primeiro case.
- Transição suave entre cases (fade/slide CSS), sem layout shift (altura estável).

- [ ] **Step 1: Implementar o componente** — esqueleto de lógica (visual por conta da impeccable):

```typescript
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CaseItem } from '../../../models/interfaces';
import { TranslatePipe } from '../../../i18n/i18n.pipe';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Vitrine auto-rotativa de cases (estilo AutoU): faixa de logos clicáveis +
 * card grande do case ativo. Rotação 3,5 s; pausa 15 s após interação; pausa
 * fora do viewport; respeita prefers-reduced-motion; SSR-safe.
 */
@Component({
  selector: 'app-professional-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './professional-showcase.component.html',
  styleUrl: './professional-showcase.component.css'
})
export class ProfessionalShowcaseComponent implements OnDestroy {
  private static readonly AUTO_ROTATE_MS = 3500;
  private static readonly PAUSE_AFTER_CLICK_MS = 15000;

  private readonly i18n = inject(I18nService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly cases = input.required<CaseItem[]>();
  readonly readCase = output<string>();

  readonly activeIndex = signal<number>(0);
  readonly activeCase = computed(() => this.cases()[this.activeIndex()] ?? null);

  private rotateTimer: ReturnType<typeof setInterval> | null = null;
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private visibilityObserver?: IntersectionObserver;
  private inViewport = true;
  private pausedByClick = false;

  private readonly setupOnCases = effect(() => {
    const total = this.cases().length;
    if (this.activeIndex() >= total) {
      this.activeIndex.set(0);
    }
    if (this.isBrowser() && total > 1) {
      this.observeViewport();
      this.startRotation();
    }
  });

  ngOnDestroy(): void {
    this.stopRotation();
    this.visibilityObserver?.disconnect();
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }
  }

  select(index: number): void {
    this.activeIndex.set(index);
    this.pauseAfterInteraction();
  }

  caseHref(slug: string): string {
    return this.i18n.language() === 'en' ? `/en/cases/${slug}` : `/cases/${slug}`;
  }

  onReadCase(event: MouseEvent, slug: string): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      return;
    }
    event.preventDefault();
    this.readCase.emit(slug);
  }

  private startRotation(): void {
    if (this.rotateTimer || this.prefersReducedMotion() || !this.inViewport || this.pausedByClick) {
      return;
    }
    this.rotateTimer = setInterval(() => {
      const total = this.cases().length;
      if (total > 1) {
        this.activeIndex.set((this.activeIndex() + 1) % total);
      }
    }, ProfessionalShowcaseComponent.AUTO_ROTATE_MS);
  }

  private stopRotation(): void {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  private pauseAfterInteraction(): void {
    this.stopRotation();
    this.pausedByClick = true;
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }
    this.pauseTimeout = setTimeout(() => {
      this.pausedByClick = false;
      this.startRotation();
    }, ProfessionalShowcaseComponent.PAUSE_AFTER_CLICK_MS);
  }

  private observeViewport(): void {
    if (this.visibilityObserver || typeof IntersectionObserver === 'undefined') {
      return;
    }
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.inViewport = entries.some(e => e.isIntersecting);
      if (this.inViewport) {
        this.startRotation();
      } else {
        this.stopRotation();
      }
    }, { threshold: 0.2 });
    this.visibilityObserver.observe(this.host.nativeElement);
  }

  private prefersReducedMotion(): boolean {
    return this.isBrowser()
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}
```

Template (`professional-showcase.component.html`) — estrutura mínima; a impeccable refina o markup/CSS:
```html
@if (activeCase(); as caseItem) {
  <div class="showcase">
    <div class="showcase-logos" role="tablist" aria-label="Cases profissionais">
      @for (item of cases(); track item.slug; let i = $index) {
        <button role="tab" class="showcase-logo" [attr.aria-selected]="i === activeIndex()"
          [class.active]="i === activeIndex()" (click)="select(i)" [title]="item.title">
          @if (item.logoUrl) {
            <img [src]="item.logoUrl" [alt]="item.client || item.title" loading="lazy" decoding="async" />
          } @else {
            <span>{{ item.client || item.title }}</span>
          }
        </button>
      }
    </div>

    <div class="showcase-card">
      <div class="showcase-media">
        @if (caseItem.coverUrl) {
          <img [src]="caseItem.coverUrl" [alt]="caseItem.title" decoding="async" />
        } @else {
          <div class="showcase-media-fallback" aria-hidden="true">
            <span>{{ caseItem.client || caseItem.title }}</span>
          </div>
        }
      </div>
      <div class="showcase-info">
        <div class="showcase-meta">
          @if (caseItem.client) { <span class="showcase-client">{{ caseItem.client }}</span> }
          @if (caseItem.status) { <span class="showcase-status">{{ caseItem.status }}</span> }
        </div>
        <h3>{{ caseItem.title }}</h3>
        @if (caseItem.stack.length > 0) {
          <div class="showcase-stack">
            @for (tech of caseItem.stack.slice(0, 6); track tech) { <span>{{ tech }}</span> }
          </div>
        }
        <a class="showcase-link" [href]="caseHref(caseItem.slug)" (click)="onReadCase($event, caseItem.slug)">
          {{ 'projects.case.readCase' | translate }}
        </a>
      </div>
    </div>
  </div>
}
```

- [ ] **Step 2: Plugar no `professional-cases`**

No `.ts`: importar `ProfessionalShowcaseComponent` e adicioná-lo ao array `imports`. No `.html`, substituir o comentário da vitrine por:
```html
  @if (!loading() && cases().length > 0) {
    <app-professional-showcase [cases]="cases()" (readCase)="readCase.emit($event)" />
  }
```
(A vitrine mostra TODOS os cases na ordem do backend, independente do filtro do grid.)

- [ ] **Step 3: CSS com impeccable** — coerente com o design system; transição fade/slide entre cases sem layout shift; faixa de logos com scroll horizontal no mobile (`overflow-x: auto`); estados de foco visíveis nos tabs.

- [ ] **Step 4: Build + verificação manual**

Run: `cd frontend && npm run build` → sem erros. Com `npm start` + backend local: vitrine rotaciona a cada 3,5 s; clique em logo troca e pausa ~15 s; sair do viewport pausa; com "reduzir movimento" ativo no SO não rotaciona; "Ler case completo" abre o modal; ctrl+clique abre `/cases/:slug` em nova aba.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/projects
git commit -m "feat(front): vitrine auto-rotativa de cases na aba Profissionais"
```

### Tarefa 15: Verificação end-to-end e ajustes finais

**Executor sugerido:** Opus/Fable.

**Files:** nenhum novo previsto (ajustes pontuais do que a verificação encontrar).

- [ ] **Step 1: Push do repo de conteúdo** (se ainda não feito na Tarefa 4) e subir o stack local

```bash
cd certificados-wesley && git status && git push; cd ..
```
Backend: `cd backend && mvn spring-boot:run` (usar o token/env de dev já configurado no ambiente do Wesley — mesmo setup usado hoje para rodar local; se o backend não subir por falta de env, reportar em vez de inventar credencial). Frontend: `cd frontend && npm start`.

- [ ] **Step 2: Checklist e2e** (marcar cada item)

1. `GET http://localhost:8080/api/content/cases?lang=pt` → 19 cases, freelas antes de autou, ordenados por `order`.
2. `GET http://localhost:8080/api/content/cases?lang=en` → títulos em inglês (fallback PT onde faltar par).
3. Home → seção Projetos abre na aba **Profissionais**; alternar para Pessoais mantém o grid antigo intacto.
4. Vitrine rotaciona; clique em logo pausa; filtro Freelance/AutoU filtra o grid.
5. "Ler case completo" (Mercearia) → readme-modal SEM frontmatter visível.
6. Galeria: case com pasta em `portfolio-gallery/` mostra botão; sem pasta, botão oculto.
7. `http://localhost:4200/cases/whatsapp-bot-tickets-sol` e `/en/cases/whatsapp-bot-tickets-sol` renderizam o case (page detail).
8. `GET http://localhost:8080/sitemap.xml` → contém `/cases/<slug>` dos 19 e NENHUM `/projects/<slug-de-case>` (exceto os 3 que também são repos públicos: `mercearia-r-v`, `experimenta-ai---soneca`, `gerador-de-cracha` — esses aparecem em `/projects/` pelos READMEs próprios, o que é correto).
9. Chat: "quais projetos o Wesley fez na AutoU?" → resposta cita cases e a aba Profissionais; "o que é a LIS da Libbs?" → responde como demo para edital, não como cliente.
10. `cd backend && mvn test` e `cd frontend && npm run build` verdes.

- [ ] **Step 3: Corrigir o que falhar** (mudanças mínimas, commitadas com mensagem `fix(...)` descritiva, sem co-autoria).

- [ ] **Step 4: Commit final de documentação**

Atualizar o checklist da fase 4 no `certificados-wesley/portfolio-content/cases/INDEX.md` (item 4 ⬜ → ✅) e commitar lá:
```bash
cd certificados-wesley
git add portfolio-content/cases/INDEX.md
git commit -m "docs(cases): fase 4 concluída — aba Profissionais no portfólio"
git push
cd ..
```
