import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { resolveApiUrl } from '../utils/api-url.util';
import { I18nService } from '../i18n/i18n.service';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  private readonly http = inject(HttpClient);
  private readonly backendProjectsApi = resolveApiUrl('/api/projects');
  private readonly i18n = inject(I18nService);

  private readonly memoryCache = new Map<string, string>();
  // Markdown cru (sem renderizar) buscado na sondagem de disponibilidade. Evita
  // refazer a requisição na abertura do modal — lá só falta renderizar.
  private readonly rawCache = new Map<string, string>();
  // Projetos que comprovadamente possuem README (controla o badge/botão).
  private readonly availableReadmes = new Set<string>();
  private probingInProgress = false;
  private markedInstance: any = null;
  private mermaidInstance: any = null;

  private async getMarked(): Promise<any> {
    if (!this.markedInstance) {
      const { marked } = await import('marked');
      marked.setOptions({ breaks: true, gfm: true });
      this.markedInstance = marked;
    }
    return this.markedInstance;
  }

  private async getMermaid(): Promise<any> {
    if (!this.mermaidInstance) {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        deterministicIds: true,
        deterministicIDSeed: 'portfolio-diagram'
      });
      this.mermaidInstance = mermaid;
    }
    return this.mermaidInstance;
  }

  /**
   * Descobre quais projetos têm README SEM renderizar (sem carregar marked nem
   * mermaid). Busca só o markdown cru e o guarda em cache, para que a abertura
   * do modal não refaça a requisição — só renderiza no clique. Roda em idle,
   * mantendo o TBT baixo (antes, renderizar ~40 docs no load era o gargalo).
   * @param projectNames Lista de nomes de projetos para sondar
   */
  async probeReadmesInBackground(projectNames: string[]): Promise<void> {
    if (this.probingInProgress) {
      return;
    }
    this.probingInProgress = true;

    for (const project of projectNames) {
      const normalized = this.normalizeProject(project);

      // Já conhecido (sondado nesta sessão ou já renderizado em cache)?
      if (this.availableReadmes.has(normalized)) {
        continue;
      }
      if (this.getReadmeContentSync(normalized)) {
        this.availableReadmes.add(normalized);
        continue;
      }

      try {
        // Espaça as requisições para não saturar a rede em idle.
        await this.delay(100);
        const markdown = await this.fetchRawMarkdown(normalized);
        if (markdown) {
          this.rawCache.set(this.cacheKey(normalized), markdown);
          this.availableReadmes.add(normalized);
        }
      } catch {
        // Projeto sem README — botão permanece oculto.
      }
    }

    this.probingInProgress = false;
  }

  /** README disponível? (cache renderizado, markdown cru sondado ou já marcado) */
  isReadmeAvailable(projectName: string): boolean {
    const normalized = this.normalizeProject(projectName);
    return this.availableReadmes.has(normalized) || !!this.getReadmeContentSync(normalized);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Busca o markdown cru (backend → fallback assets locais) SEM renderizar. */
  private async fetchRawMarkdown(projectName: string): Promise<string> {
    const normalized = this.normalizeProject(projectName);

    // 1) Backend: busca dinâmica do repositório GitHub.
    const backendUrl = `${this.backendProjectsApi}/${encodeURIComponent(normalized)}/markdown`;
    try {
      const markdown = await lastValueFrom(this.http.get(backendUrl, { responseType: 'text' }));
      if (markdown) return markdown;
    } catch {
      // Cai no fallback de assets locais.
    }

    // 2) Fallback: assets locais.
    const mdPath = `assets/portfolio_md/${this.mapProjectToFile(normalized)}`;
    try {
      return await lastValueFrom(this.http.get(mdPath, { responseType: 'text' }));
    } catch {
      return '';
    }
  }

  async preloadProject(projectName: string): Promise<string> {
    const normalized = this.normalizeProject(projectName);
    const existing = this.getReadmeContentSync(normalized);
    if (existing) return existing;

    const rawKey = this.cacheKey(normalized);
    // Reaproveita o markdown cru da sondagem quando disponível; senão, busca.
    const markdown = this.rawCache.get(rawKey) ?? await this.fetchRawMarkdown(normalized);
    if (!markdown) return '';

    const html = await this.renderMarkdownToHtmlInternal(markdown, normalized);
    this.setCache(normalized, html);
    // Mantém o cru no cache para o botão de download (evita refazer a requisição).
    this.rawCache.set(rawKey, markdown);
    this.availableReadmes.add(normalized);
    return html;
  }

  /**
   * Retorna o markdown cru (para o botão de download), reaproveitando o cache
   * preenchido na sondagem/renderização. Só faz requisição se ainda não estiver
   * em cache — evita o fetch duplicado ao abrir o modal.
   */
  async getRawMarkdown(projectName: string): Promise<string> {
    const normalized = this.normalizeProject(projectName);
    const rawKey = this.cacheKey(normalized);
    const cached = this.rawCache.get(rawKey);
    if (cached) return cached;
    const markdown = await this.fetchRawMarkdown(normalized);
    if (markdown) this.rawCache.set(rawKey, markdown);
    return markdown;
  }

  /**
   * Renderiza markdown básico para HTML com classes markdown-text.
   * Método público para reutilização (DRY).
   * @deprecated Use renderMarkdownToHtml para funcionalidades completas
   */
  async renderMarkdownBase(markdown: string): Promise<string> {
    const marked = await this.getMarked();
    const html = marked.parse(markdown) as string;
    return this.applyMarkdownTextClasses(html);
  }

  /**
   * Aplica classes markdown-text em todos os elementos HTML.
   * Método público para reutilização (DRY).
   */
  applyMarkdownTextClasses(html: string): string {
    html = html.replace(/<h([1-6])>/g, '<h$1 class="markdown-text">');
    html = html.replace(/<p>/g, '<p class="markdown-text">');
    html = html.replace(/<li>/g, '<li class="markdown-text">');
    html = html.replace(/<ul>/g, '<ul class="markdown-text">');
    html = html.replace(/<ol>/g, '<ol class="markdown-text">');
    html = html.replace(/<span>/g, '<span class="markdown-text">');
    html = html.replace(/<strong>/g, '<strong class="markdown-text">');
    html = html.replace(/<em>/g, '<em class="markdown-text">');
    html = html.replace(/<table>/g, '<table class="markdown-text">');
    html = html.replace(/<th>/g, '<th class="markdown-text">');
    html = html.replace(/<td>/g, '<td class="markdown-text">');
    html = html.replace(/<tr>/g, '<tr class="markdown-text">');
    html = html.replace(/<a /g, '<a class="markdown-text" ');
    html = html.replace(/<blockquote>/g, '<blockquote class="markdown-text">');
    html = html.replace(/<div>/g, '<div class="markdown-text">');
    return html;
  }

  getReadmeContentSync(projectName: string): string {
    const key = this.cacheKey(projectName);
    if (this.memoryCache.has(key)) return this.memoryCache.get(key) as string;
    try {
      const stored = localStorage.getItem(this.localStorageKey(key));
      return stored || '';
    } catch {
      return '';
    }
  }

  private setCache(project: string, html: string): void {
    const key = this.cacheKey(project);
    this.memoryCache.set(key, html);
    try {
      localStorage.setItem(this.localStorageKey(key), html);
    } catch { }
  }

  private localStorageKey(projectKey: string): string {
    return `readme_html_${projectKey}_${this.languageKey()}`;
  }

  private languageKey(): string {
    try {
      return this.i18n.getLanguageForBackend?.() ?? 'pt';
    } catch {
      return 'pt';
    }
  }

  private cacheKey(project: string): string {
    return `${this.normalizeProject(project)}__${this.languageKey()}`;
  }

  /**
   * Mapeia nome do projeto para nome do arquivo markdown.
   * Retorna o nome normalizado + .md para qualquer projeto (dinâmico).
   */
  mapProjectToFile(project: string): string {
    // Dinâmico: qualquer projeto pode ter um markdown
    return `${this.normalizeProject(project)}.md`;
  }

  private normalizeProject(project: string): string {
    return project.toLowerCase();
  }

  private generateId(project: string, title: string): string {
    const norm = (s: string) => s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
    return `${norm(project)}-${norm(title)}`;
  }

  private extractTitle(mermaidCode: string): string | null {
    const lines = mermaidCode.split('\n').map(l => l.trim());
    for (const line of lines) {
      const r1 = /%%\{\s*title\s*:\s*["']([^"']+)["']\s*\}%%/i;
      const r2 = /title\s*:\s*["']([^"']+)["']/i;
      const r3 = /title\s+["']([^"']+)["']/i;
      const m1 = r1.exec(line);
      if (m1) return m1[1];
      const m2 = r2.exec(line);
      if (m2) return m2[1];
      const m3 = r3.exec(line);
      if (m3) return m3[1];
    }
    return null;
  }

  /**
   * Renderiza markdown completo para HTML com todas as funcionalidades:
   * - Mermaid diagrams
   * - Code blocks melhorados
   * - Classes markdown-text
   * Método público para reutilização (DRY).
   * @param markdown Texto markdown a ser renderizado
   * @param contextId ID de contexto para gerar IDs únicos (ex: 'chat', 'project-name')
   */
  async renderMarkdownToHtml(markdown: string, contextId: string = 'default'): Promise<string> {
    // 1) Convert fences to placeholders we can replace after marked
    const fence = /```[ \t]*mermaid[^\n]*\r?\n([\s\S]*?)\r?\n```/gim;
    const blocks: { code: string; title: string; id: string }[] = [];
    const mdWithTokens = markdown.replace(fence, (_m, code) => {
      const clean = String(code).replace(/\r/g, '').trim();
      const title = this.extractTitle(clean);
      if (!title) return _m;
      const id = this.generateId(contextId, title);
      blocks.push({ code: clean, title, id });
      return `<!--MERMAID:${id}-->`;
    });

    // 2) Parse markdown to HTML
    const marked = await this.getMarked();
    let html = marked.parse(mdWithTokens) as string;

    // Wrap markdown content with specific class to avoid affecting code blocks
    html = this.applyMarkdownTextClasses(html);

    // 3) Enhance code blocks with proper structure - header OUTSIDE the pre
    html = html.replace(
      /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
      '<div class="code-block-enhanced"><div class="code-block-header"><span class="code-language">$1</span><button class="copy-btn" onclick="this.copyCode()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg><span>Copiar</span></button></div><pre><code class="language-$1">$2</code></pre></div>'
    );
    html = html.replace(
      /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
      '<div class="code-block-enhanced"><div class="code-block-header"><span class="code-language">TEXT</span><button class="copy-btn" onclick="this.copyCode()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg><span>Copiar</span></button></div><pre><code class="language-text">$1</code></pre></div>'
    );

    // 4) Render each mermaid block to inline SVG and inject container
    const mermaid = await this.getMermaid();
    for (const b of blocks) {
      const tempId = `m_${b.id}`;
      const { svg } = await mermaid.render(tempId, b.code);
      const container =
        `<div class="mermaid-diagram" id="${b.id}-container" data-context="${contextId}" data-diagram-id="${b.id}">` +
        `<div class="mermaid-header">` +
        `<div class="mermaid-title">${b.title}</div>` +
        `<div class="mermaid-controls">` +
        `<button class="mermaid-download-btn" onclick="this.downloadMermaid('${b.id}')" title="Baixar diagrama">` +
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">` +
        `<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>` +
        `</svg>` +
        `</button>` +
        `<button class="mermaid-fullscreen-btn" onclick="this.openMermaidFullscreen('${b.id}')" title="Ver em tela cheia">` +
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">` +
        `<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>` +
        `</svg>` +
        `</button>` +
        `</div>` +
        `</div>` +
        `<div class="mermaid-content">${svg}</div>` +
        `</div>`;
      html = html.replace(`<!--MERMAID:${b.id}-->`, container);
    }

    return html;
  }

  private async renderMarkdownToHtmlInternal(markdown: string, project: string): Promise<string> {
    return this.renderMarkdownToHtml(markdown, project);
  }
}

