import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { marked } from 'marked';
import { lastValueFrom } from 'rxjs';
import mermaid from 'mermaid';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  private readonly memoryCache = new Map<string, string>();

  constructor(private readonly http: HttpClient) {
    marked.setOptions({ breaks: true, gfm: true });
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      deterministicIds: true,
      deterministicIDSeed: 'portfolio-diagram'
    });
  }

  // Compat: pré-carrega todos os projetos conhecidos
  async preloadAllMermaidDiagrams(): Promise<void> {
    const projects = ['aa_space', 'lol-matchmaking-fazenda', 'mercearia-r-v'];
    for (const p of projects) {
      try {
        await this.preloadProject(p);
      } catch {
        // ignora falhas individuais
      }
    }
  }

  async preloadProject(projectName: string): Promise<string> {
    const normalized = this.normalizeProject(projectName);
    const existing = this.getReadmeContentSync(normalized);
    if (existing) return existing;

    const file = this.mapProjectToFile(normalized);
    if (!file) return '';
    const mdPath = `assets/portfolio_md/${file}`;
    let markdown = '';
    try {
      markdown = await lastValueFrom(this.http.get(mdPath, { responseType: 'text' }));
    } catch {
      markdown = '';
    }
    if (!markdown) return '';
    const html = await this.renderMarkdownToHtml(markdown, normalized);
    this.setCache(normalized, html);
    return html;
  }

  getReadmeContentSync(projectName: string): string {
    const key = this.normalizeProject(projectName);
    if (this.memoryCache.has(key)) return this.memoryCache.get(key) as string;
    try {
      const stored = localStorage.getItem(this.localStorageKey(key));
      return stored || '';
    } catch {
      return '';
    }
  }

  private setCache(project: string, html: string): void {
    this.memoryCache.set(project, html);
    try {
      localStorage.setItem(this.localStorageKey(project), html);
    } catch { }
  }

  private localStorageKey(project: string): string {
    return `readme_html_${project}`;
  }

  mapProjectToFile(project: string): string | null {
    const m: Record<string, string> = {
      'aa_space': 'aa_space.md',
      'lol-matchmaking-fazenda': 'lol-matchmaking-fazenda.md',
      'mercearia-r-v': 'mercearia-r-v.md',
      'lol-matchmaking': 'lol-matchmaking-fazenda.md',
      'traffic_manager': 'traffic_manager.md',
      'first-angular-app': 'first-angular-app.md',
      'investment_calculator': 'investment_calculator.md'
    };
    return m[project] || null;
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

  private async renderMarkdownToHtml(markdown: string, project: string): Promise<string> {
    // 1) Convert fences to placeholders we can replace after marked
    const fence = /```[ \t]*mermaid[^\n]*\r?\n([\s\S]*?)\r?\n```/gim; // parentheses already isolate the capture group
    const blocks: { code: string; title: string; id: string }[] = [];
    const mdWithTokens = markdown.replace(fence, (_m, code) => {
      const clean = String(code).replace(/\r/g, '').trim();
      const title = this.extractTitle(clean);
      if (!title) return _m; // keep original if no title
      const id = this.generateId(project, title);
      blocks.push({ code: clean, title, id });
      return `<!--MERMAID:${id}-->`;
    });

    // 2) Parse markdown to HTML
    let html = marked.parse(mdWithTokens) as string;

    // Wrap markdown content with specific class to avoid affecting code blocks
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

    // 3) Enhance code blocks with proper structure - header OUTSIDE the pre
    html = html.replace(
      /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
      '<div class="code-block-enhanced"><div class="code-block-header"><span class="code-language">$1</span><button class="copy-btn" onclick="this.copyCode()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg><span>Copiar</span></button></div><pre><code class="language-$1">$2</code></pre></div>'
    );
    html = html.replace(
      /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
      '<div class="code-block-enhanced"><div class="code-block-header"><span class="code-language">TEXT</span><button class="copy-btn" onclick="this.copyCode()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg><span>Copiar</span></button></div><pre><code class="language-text">$1</code></pre></div>'
    );

    // 5) Render each mermaid block to inline SVG and inject container
    for (const b of blocks) {
      const tempId = `m_${b.id}`;
      const { svg } = await mermaid.render(tempId, b.code);
      const container =
        `<div class="mermaid-diagram" id="${b.id}-container" data-project="${project}" data-diagram-id="${b.id}">` +
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
}

