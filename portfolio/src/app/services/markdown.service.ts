import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { marked } from 'marked';
import mermaid from 'mermaid';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  private cache = new Map<string, string>();
  private mermaidCache = new Map<string, { svg: string; timestamp: number; projectName: string }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas em millisegundos
  private readonly MAX_CACHE_SIZE = 50; // Máximo de diagramas em cache
  private renderQueue: string[] = []; // Fila de renderização
  private isRendering = false; // Flag para evitar renderizações concorrentes

  constructor(private readonly http: HttpClient) {
    // Configurar marked
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    // Configurar mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif',
      deterministicIds: true,
      deterministicIDSeed: 'mermaid-diagram'
    });

    // Configurar funções globais de controle dos diagramas
    this.setupGlobalDiagramControls();
  }

  // Método para limpar cache
  public clearCache(projectName?: string): void {
    if (projectName) {
      // Limpar cache específico do projeto
      this.cache.delete(projectName);
      // Limpar cache de mermaid relacionado ao projeto
      for (const [key] of this.mermaidCache) {
        if (key.includes(projectName)) {
          this.mermaidCache.delete(key);
        }
      }
      // Limpar cache do localStorage relacionado ao projeto
      this.clearLocalStorageCache(projectName);
    } else {
      // Limpar todo o cache
      this.cache.clear();
      this.mermaidCache.clear();
      this.clearAllLocalStorageCache();
    }
    console.log(`🧹 Cache limpo${projectName ? ` para ${projectName}` : ' completamente'}`);
  }

  // Método para forçar limpeza completa e re-renderização
  public async forceRerenderAllDiagrams(projectName: string): Promise<void> {
    console.log(`🔄 Forçando re-renderização completa para ${projectName}`);

    // Limpar todos os caches
    this.clearCache(projectName);

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 100));

    // Pré-renderizar novamente
    await this.preRenderMermaidDiagrams(projectName);

    console.log(`✅ Re-renderização completa concluída para ${projectName}`);
  }

  // Método para limpar cache de diagramas com IDs conflitantes
  public clearConflictingDiagramCache(projectName: string): void {
    console.log(`🧹 Limpando cache de diagramas conflitantes para ${projectName}`);

    // Limpar cache específico do projeto
    this.cache.delete(projectName);

    // Limpar cache de mermaid relacionado ao projeto
    for (const [key] of this.mermaidCache) {
      if (key.includes(projectName)) {
        this.mermaidCache.delete(key);
        console.log(`🗑️ Removido diagrama conflitante do cache: ${key}`);
      }
    }

    // Limpar cache do localStorage relacionado ao projeto
    this.clearLocalStorageCache(projectName);

    console.log(`✅ Cache de diagramas conflitantes limpo para ${projectName}`);
  }

  // Método para verificar se cache é válido (não expirado)
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  // Método para limpar cache expirado
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.mermaidCache) {
      if (!this.isCacheValid(value.timestamp)) {
        this.mermaidCache.delete(key);
        console.log(`🗑️ Cache expirado removido: ${key}`);
      }
    }
  }

  // Método para gerenciar cache com LRU
  private manageCacheSize(): void {
    if (this.mermaidCache.size > this.MAX_CACHE_SIZE) {
      // Converter para array e ordenar por timestamp (mais antigo primeiro)
      const entries = Array.from(this.mermaidCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remover os 10% mais antigos
      const toRemove = Math.ceil(this.MAX_CACHE_SIZE * 0.1);
      for (let i = 0; i < toRemove; i++) {
        const [key] = entries[i];
        this.mermaidCache.delete(key);
        console.log(`🗑️ Cache LRU removido: ${key}`);
      }
    }
  }

  // Método para atualizar timestamp de acesso
  private updateAccessTime(diagramId: string): void {
    const cached = this.mermaidCache.get(diagramId);
    if (cached) {
      cached.timestamp = Date.now();
    }
  }

  // Método para verificar status do cache
  public getCacheStatus(projectName: string): void {
    // Limpar cache expirado antes de verificar
    this.cleanExpiredCache();

    console.log(`📊 Status do cache para ${projectName}:`);
    console.log(`📄 README em cache: ${this.cache.has(projectName) ? '✅' : '❌'}`);
    console.log(`🎨 Diagramas Mermaid em cache: ${this.mermaidCache.size}`);

    const projectDiagrams = Array.from(this.mermaidCache.keys()).filter(key =>
      key.includes(projectName.toLowerCase()) || key.includes('mermaid-diagram')
    );
    console.log(`🎯 Diagramas relacionados ao projeto: ${projectDiagrams.length}`);

    projectDiagrams.forEach(diagramId => {
      const diagramData = this.mermaidCache.get(diagramId);
      if (diagramData) {
        const age = Math.round((Date.now() - diagramData.timestamp) / (1000 * 60)); // idade em minutos
        console.log(`  - ${diagramId}: ${diagramData.svg.length + ' caracteres'} (${age}min atrás)`);
      } else {
        console.log(`  - ${diagramId}: não encontrado`);
      }
    });
  }

  // Método para forçar atualização do conteúdo (ignora cache)
  public forceUpdateReadmeContent(projectName: string): Observable<string> {
    console.log(`🔄 Forçando atualização do README para ${projectName}`);

    // Verificar se já está no cache primeiro (após pré-renderização)
    if (this.cache.has(projectName)) {
      console.log(`✅ Usando README do cache (após pré-renderização) para ${projectName}`);
      return of(this.cache.get(projectName)!);
    }

    // Limpar cache específico primeiro
    this.clearCache(projectName);

    // Mapear nomes de projetos para arquivos markdown
    const readmeFileName = this.getReadmeFileName(projectName);

    if (!readmeFileName) {
      console.warn(`❌ Nenhum arquivo README mapeado para ${projectName}`);
      return of('');
    }

    const readmePath = `assets/portfolio_md/${readmeFileName}`;
    console.log(`📂 Carregando README de: ${readmePath}`);

    return this.http.get(readmePath, { responseType: 'text' })
      .pipe(
        map(content => {
          const processedContent = this.parseMarkdown(content, projectName);
          // Salvar no cache após processamento
          this.cache.set(projectName, processedContent);
          console.log(`💾 README atualizado e salvo no cache para ${projectName}`);
          return processedContent;
        }),
        catchError(error => {
          console.error(`❌ Erro ao forçar atualização do README para ${projectName}:`, error);
          return of('');
        })
      );
  }

  // Método para limpar cache específico do localStorage
  private clearLocalStorageCache(projectName: string): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mermaid_diagram_') && key.includes(projectName.toLowerCase())) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removido do localStorage: ${key}`);
      });
    } catch (error) {
      console.warn('Erro ao limpar cache do localStorage:', error);
    }
  }

  // Método para limpar todo o cache do localStorage
  private clearAllLocalStorageCache(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mermaid_diagram_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      console.log(`Removidos ${keysToRemove.length} itens do localStorage`);
    } catch (error) {
      console.warn('Erro ao limpar todo o cache do localStorage:', error);
    }
  }

  getReadmeContent(projectName: string): Observable<string> {
    // Verificar cache primeiro (pré-carregado em segundo plano)
    if (this.cache.has(projectName)) {
      console.log(`⚡ Usando markdown pré-cacheado para ${projectName} (instantâneo!)`);
      return of(this.cache.get(projectName)!);
    }

    // Mapear nomes de projetos para arquivos markdown
    const readmeFileName = this.getReadmeFileName(projectName);

    if (!readmeFileName) {
      return of('');
    }

    const readmePath = `assets/portfolio_md/${readmeFileName}`;

    return this.http.get(readmePath, { responseType: 'text' })
      .pipe(
        map(content => {
          const processedContent = this.parseMarkdown(content, projectName);
          // Salvar no cache
          this.cache.set(projectName, processedContent);
          console.log(`README processado e salvo no cache para ${projectName}`);
          return processedContent;
        }),
        catchError(error => {
          console.error(`Erro ao carregar README para ${projectName}:`, error);
          return of('');
        })
      );
  }

  private getReadmeFileName(projectName: string): string | null {
    console.log(`Buscando arquivo README para projeto: "${projectName}"`);

    // Mapear nomes de repositórios para nomes de arquivos markdown
    const projectMappings: { [key: string]: string } = {
      'fazenda-inhouse': 'README - Fazenda inhouse.md',
      'lol-matchmaking': 'README - LOL Matchmaking.md',
      'lol-matchmaking-fazenda': 'README - LOL Matchmaking.md',
      'mercearia-r-v': 'README - Mercearia-R-V.md',
      'aa_space': 'README - AA_Space.md',
      'aa-space': 'README - AA_Space.md',
      // Adicione mais mapeamentos conforme necessário
    };

    console.log('Mapeamentos disponíveis:', Object.keys(projectMappings));

    // Tentar encontrar por nome exato
    const exactMatch = projectMappings[projectName.toLowerCase()];
    if (exactMatch) {
      console.log(`Match exato encontrado: "${exactMatch}"`);
      return exactMatch;
    }

    // Tentar encontrar por nome similar
    const projectNameLower = projectName.toLowerCase();
    console.log(`Buscando match similar para: "${projectNameLower}"`);

    for (const [key, value] of Object.entries(projectMappings)) {
      if (projectNameLower.includes(key) || key.includes(projectNameLower)) {
        console.log(`Match similar encontrado: "${key}" -> "${value}"`);
        return value;
      }
    }

    console.log(`Nenhum arquivo README encontrado para: "${projectName}"`);
    return null;
  }

  private parseMarkdown(content: string, projectName?: string): string {
    // Converter markdown para HTML usando marked
    const htmlContent = marked.parse(content) as string;
    console.log('📄 HTML gerado pelo marked:', htmlContent.substring(0, 500) + '...');

    // Processar primeiro os diagramas mermaid (antes dos code blocks)
    let processedContent = this.processMermaidDiagrams(htmlContent, projectName);
    console.log('🎨 Após processar Mermaid:', processedContent.substring(0, 500) + '...');

    // Depois processar code blocks normais
    processedContent = this.processCodeBlocks(processedContent);
    console.log('💻 Após processar Code Blocks:', processedContent.substring(0, 500) + '...');

    return processedContent;
  }

  private processCodeBlocks(htmlContent: string): string {
    // Melhorar code blocks com classes CSS - processar apenas os que NÃO são mermaid
    console.log('Processando code blocks...');
    let processedContent = htmlContent
      // Combina <code> com class que contenha language-<lang> e quaisquer outras classes
      .replace(/<pre><code class="[^"]*\blanguage-([a-z0-9-]+)\b[^"]*">([\s\S]*?)<\/code><\/pre>/gi, (match, language, code) => {
        console.log(`Encontrado code block: ${language}`);
        // Pular se for mermaid (já processado)
        if (language === 'mermaid') {
          return match;
        }

        const cleanCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&nbsp;/g, ' ');

        // Usar PrismJS para syntax highlighting
        const highlightedCode = this.highlightCode(cleanCode, language);

        return `<div class="code-block" style="margin: 1.5rem 0 !important; background: #2a2a2a !important; border-radius: 8px !important; overflow: hidden !important; border: 1px solid #333 !important; font-family: 'Courier New', monospace !important;">
                    <div class="code-header" style="display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 0.75rem 1rem !important; background: #1a1a1a !important; border-bottom: 1px solid #333 !important;">
                        <span class="code-language" style="font-size: 0.875rem !important; font-weight: 600 !important; color: #DBC27D !important; text-transform: uppercase !important;">${language}</span>
                        <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${cleanCode.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')" style="background: none !important; border: 1px solid #333 !important; color: #ccc !important; padding: 0.25rem 0.5rem !important; border-radius: 4px !important; cursor: pointer !important; font-size: 0.75rem !important;">📋</button>
                    </div>
                    <pre style="margin: 0 !important; padding: 1rem !important; overflow-x: auto !important; background: transparent !important; border: none !important;"><code class="language-${language}" style="background: none !important; padding: 0 !important; border: none !important; font-family: inherit !important; font-size: 0.9rem !important; line-height: 1.5 !important; color: #d4d4d4 !important;">${highlightedCode}</code></pre>
                </div>`;
      })
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (match, code) => {
        const cleanCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&nbsp;/g, ' ');

        console.log(`Encontrado code block: text (sem linguagem)`);

        return `<div class="code-block" style="margin: 1.5rem 0 !important; background: #2a2a2a !important; border-radius: 8px !important; overflow: hidden !important; border: 1px solid #333 !important; font-family: 'Courier New', monospace !important;">
                    <div class="code-header" style="display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 0.75rem 1rem !important; background: #1a1a1a !important; border-bottom: 1px solid #333 !important;">
                        <span class="code-language" style="font-size: 0.875rem !important; font-weight: 600 !important; color: #DBC27D !important; text-transform: uppercase !important;">text</span>
                        <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${cleanCode.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')" style="background: none !important; border: 1px solid #333 !important; color: #ccc !important; padding: 0.25rem 0.5rem !important; border-radius: 4px !important; cursor: pointer !important; font-size: 0.75rem !important;">📋</button>
                    </div>
                    <pre style="margin: 0 !important; padding: 1rem !important; overflow-x: auto !important; background: transparent !important; border: none !important;"><code style="background: none !important; padding: 0 !important; border: none !important; font-family: inherit !important; font-size: 0.9rem !important; line-height: 1.5 !important; color: #d4d4d4 !important;">${cleanCode}</code></pre>
                </div>`;
      });

    return processedContent;
  }

  private highlightCode(code: string, language: string): string {
    try {
      // Verificar se a linguagem é suportada pelo PrismJS
      if (Prism.languages[language]) {
        return Prism.highlight(code, Prism.languages[language], language);
      } else {
        // Fallback para linguagem não suportada
        return code;
      }
    } catch (error) {
      console.warn(`Erro ao fazer syntax highlighting para ${language}:`, error);
      return code;
    }
  }

  private processMermaidDiagrams(htmlContent: string, projectName?: string): string {
    // Encontrar blocos de código mermaid - suporta class="language-mermaid" ou class="mermaid" com classes extras
    const mermaidRegex = /<pre><code class="[^"]*\b(?:language-)?mermaid\b[^"]*">([\s\S]*?)<\/code><\/pre>/gi;

    let processedContent = htmlContent.replace(mermaidRegex, (match, diagramCode) => {
      try {
        // Decodificar HTML entities que podem ter sido escapadas
        const cleanDiagramCode = diagramCode
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .trim();

        // Extrair título do diagrama Mermaid
        const diagramTitle = this.extractMermaidTitle(cleanDiagramCode);

        if (!diagramTitle) {
          console.warn(`⚠️ Diagrama sem título explícito, pulando...`);
          return match; // Retorna o código original se não tem título
        }

        const diagramId = this.generateUniqueDiagramId(projectName || '', diagramTitle, cleanDiagramCode);
        const legacyId = this.sanitizeTitle(diagramTitle); // ID antigo (apenas título)

        console.log(`🎯 Processando diagrama: ${diagramTitle} (ID: ${diagramId}) para projeto: ${projectName || 'N/A'}`);

        // Verificar se já existe no cache com novo ID primeiro
        let cacheData = this.mermaidCache.get(diagramId);
        let cachedSvg = cacheData ? (this.isCacheValid(cacheData.timestamp) ? cacheData.svg : null) : this.getCachedDiagram(diagramId);

        // Se não encontrou com novo ID, tentar com ID legado
        if (!cachedSvg) {
          console.log(`🔄 Tentando buscar com ID legado: ${legacyId}`);
          const legacyCacheData = this.mermaidCache.get(legacyId);
          const legacyCachedSvg = legacyCacheData ? (this.isCacheValid(legacyCacheData.timestamp) ? legacyCacheData.svg : null) : this.getCachedDiagram(legacyId);

          if (legacyCachedSvg) {
            console.log(`✅ Encontrado com ID legado, migrando para novo ID: ${legacyId} → ${diagramId}`);
            // Migrar para novo ID
            this.mermaidCache.set(diagramId, {
              svg: legacyCachedSvg,
              timestamp: legacyCacheData?.timestamp || Date.now(),
              projectName: projectName || ''
            });
            // Salvar no localStorage com novo ID
            this.saveCachedDiagram(diagramId, legacyCachedSvg);
            // Remover ID legado
            this.mermaidCache.delete(legacyId);
            this.removeCachedDiagram(legacyId);

            cachedSvg = legacyCachedSvg;
            cacheData = this.mermaidCache.get(diagramId);
          }
        }

        console.log(`🔍 Verificando cache para diagrama ${diagramTitle} (ID: ${diagramId}):`);
        console.log(`  - Cache em memória: ${this.mermaidCache.has(diagramId) ? '✅' : '❌'}`);
        console.log(`  - Cache válido: ${cacheData ? this.isCacheValid(cacheData.timestamp) ? '✅' : '❌ (expirado)' : '❌'}`);
        console.log(`  - Cache localStorage: ${this.getCachedDiagram(diagramId) ? '✅' : '❌'}`);
        console.log(`  - SVG encontrado: ${cachedSvg ? '✅ (' + cachedSvg.length + ' chars)' : '❌'}`);

        // Log adicional para debug
        if (!cachedSvg) {
          console.log(`⚠️ Diagrama ${diagramTitle} não encontrado no cache - será renderizado`);
          console.log(`📊 Total de diagramas em cache: ${this.mermaidCache.size}`);
          console.log(`📋 IDs em cache:`, Array.from(this.mermaidCache.keys()));
        } else {
          console.log(`✅ SVG encontrado no cache para ${diagramTitle} - substituindo código Mermaid`);
        }

        if (cachedSvg) {
          console.log(`✅ Usando diagrama do cache: ${diagramId}`);
          return `<div class="mermaid-diagram" id="${diagramId}-container" data-project="${projectName || ''}" data-diagram-id="${diagramId}" style="margin: 1.5rem 0 !important; text-align: center !important; background: var(--bg-secondary) !important; border-radius: 8px !important; padding: 1rem !important; border: 1px solid var(--border-color) !important; position: relative !important;">
                      ${diagramTitle ? `<div class="mermaid-title" style="font-size: 0.9rem; font-weight: 600; color: var(--color-accent); margin-bottom: 0.5rem; text-align: center;">${diagramTitle}</div>` : ''}
                      <div class="mermaid-controls" style="position: absolute !important; top: 0.5rem !important; right: 0.5rem !important; display: flex !important; gap: 0.25rem !important; z-index: 10 !important;">
                        <button class="download-svg-btn" onclick="downloadSVG('${diagramId}', '${diagramTitle || 'diagrama'}')" style="background: var(--bg-primary) !important; border: 1px solid var(--border-color) !important; color: var(--text-color) !important; padding: 0.25rem 0.5rem !important; border-radius: 4px !important; cursor: pointer !important; font-size: 0.75rem !important; transition: all 0.2s ease !important;" onmouseover="this.style.background='var(--color-accent)'" onmouseout="this.style.background='var(--bg-primary)'" title="Baixar SVG">📥</button>
                        <button class="fullscreen-btn" onclick="toggleFullscreen('${diagramId}')" style="background: var(--bg-primary) !important; border: 1px solid var(--border-color) !important; color: var(--text-color) !important; padding: 0.25rem 0.5rem !important; border-radius: 4px !important; cursor: pointer !important; font-size: 0.75rem !important; transition: all 0.2s ease !important;" onmouseover="this.style.background='var(--color-accent)'" onmouseout="this.style.background='var(--bg-primary)'" title="Tela cheia">⛶</button>
                      </div>
                      <div class="mermaid-content" style="width: 100% !important; min-height: 200px !important; display: block !important; text-align: center !important; padding: 1rem !important; overflow: auto !important;">${cachedSvg}</div>
                  </div>`;
        } else {
          console.log(`⚠️ Diagrama não encontrado no cache, será renderizado: ${diagramId}`);
          // Retornar container que será processado quando o modal for aberto
          return `<div class="mermaid-diagram" id="${diagramId}-container" data-project="${projectName || ''}" data-diagram-id="${diagramId}" data-mermaid-code="${encodeURIComponent(cleanDiagramCode)}" data-diagram-title="${diagramTitle || ''}" style="margin: 1.5rem 0 !important; text-align: center !important; background: var(--bg-secondary) !important; border-radius: 8px !important; padding: 1rem !important; border: 1px solid var(--border-color) !important; position: relative !important;">
                    ${diagramTitle ? `<div class="mermaid-title" style="font-size: 0.9rem; font-weight: 600; color: var(--color-accent); margin-bottom: 0.5rem; text-align: center;">${diagramTitle}</div>` : ''}
                    <div class="mermaid-controls" style="position: absolute !important; top: 0.5rem !important; right: 0.5rem !important; display: flex !important; gap: 0.25rem !important; z-index: 10 !important; opacity: 0.5 !important;">
                      <button class="download-svg-btn" disabled style="background: var(--bg-primary) !important; border: 1px solid var(--border-color) !important; color: var(--text-color) !important; padding: 0.25rem 0.5rem !important; border-radius: 4px !important; cursor: not-allowed !important; font-size: 0.75rem !important;" title="Aguarde o carregamento">📥</button>
                      <button class="fullscreen-btn" disabled style="background: var(--bg-primary) !important; border: 1px solid var(--border-color) !important; color: var(--text-color) !important; padding: 0.25rem 0.5rem !important; border-radius: 4px !important; cursor: not-allowed !important; font-size: 0.75rem !important;" title="Aguarde o carregamento">⛶</button>
                    </div>
                    <div class="mermaid-loading" style="color: var(--color-accent) !important; font-style: italic !important; padding: 1rem !important;">Carregando diagrama...</div>
                    <div class="mermaid-content" style="width: 100% !important; min-height: 200px !important; display: block !important; text-align: center !important; padding: 1rem !important; overflow: auto !important;"></div>
                </div>`;
        }
      } catch (error) {
        console.error('Erro ao processar diagrama mermaid:', error);
        return `<div class="mermaid-error">Erro ao processar diagrama: ${error}</div>`;
      }
    });

    return processedContent;
  }

  // Método para extrair título do diagrama Mermaid
  private extractMermaidTitle(mermaidCode: string): string | null {
    const lines = mermaidCode.split('\n').map(line => line.trim());

    // Procurar por diferentes padrões de título
    for (const line of lines) {
      // Padrão 1: %%{title: "Título do Diagrama"}%%
      if (line.includes('%%{title:')) {
        const titleMatch = line.match(/%%\{\s*title\s*:\s*["']([^"']+)["']\s*\}%%/i);
        if (titleMatch) {
          console.log(`📝 Título encontrado no formato %%{title: "...}%%: ${titleMatch[1]}`);
          return titleMatch[1];
        }
      }

      // Padrão 2: title: "Título do Diagrama" (sem %%)
      if (line.includes('title:') || line.includes('title :')) {
        const titleMatch = line.match(/title\s*:\s*["']([^"']+)["']/i);
        if (titleMatch) {
          console.log(`📝 Título encontrado no formato title: "...": ${titleMatch[1]}`);
          return titleMatch[1];
        }
      }

      // Padrão 3: title "Título do Diagrama"
      if (line.toLowerCase().includes('title')) {
        const titleMatch = line.match(/title\s+["']([^"']+)["']/i);
        if (titleMatch) {
          console.log(`📝 Título encontrado no formato title "...": ${titleMatch[1]}`);
          return titleMatch[1];
        }
      }
    }

    // Se não encontrar título específico, tentar usar o primeiro comentário como título
    const firstLine = lines[0];
    if (firstLine.startsWith('%%') && firstLine.endsWith('%%')) {
      const comment = firstLine.slice(2, -2).trim();
      if (comment && !comment.includes('init:') && !comment.includes('config:')) {
        return comment;
      }
    }

    // Se não encontrar título, tentar inferir do conteúdo
    if (mermaidCode.includes('Redis') && mermaidCode.includes('Cache')) {
      return 'Sistema de Cache e Invalidação';
    } else if (mermaidCode.includes('Electron Desktop App')) {
      return 'Arquitetura Desktop App';
    } else if (mermaidCode.includes('Electron App')) {
      return 'Arquitetura Sistema';
    } else if (mermaidCode.includes('Spring Boot')) {
      return 'Arquitetura Backend';
    } else if (mermaidCode.includes('Angular Frontend') && mermaidCode.includes('Node.js Backend')) {
      return 'Arquitetura Geral do Sistema';
    } else if (mermaidCode.includes('Electron Desktop App') && mermaidCode.includes('Spring Boot Backend')) {
      return 'Arquitetura Geral do Sistema';
    }

    console.log(`🔍 Nenhum título inferido para diagrama com conteúdo:`, mermaidCode.substring(0, 100) + '...');
    return null;
  }

  // Método para gerar ID único do diagrama baseado no título
  private generateUniqueDiagramId(projectName: string, diagramTitle: string | null, mermaidCode: string): string {
    if (diagramTitle) {
      // Criar ID único combinando projeto, título e hash do conteúdo
      const projectPrefix = projectName ? `${this.sanitizeTitle(projectName)}-` : '';
      const titleSanitized = this.sanitizeTitle(diagramTitle);
      const contentHash = this.createHash(mermaidCode).substring(0, 8);
      return `${projectPrefix}${titleSanitized}-${contentHash}`;
    } else {
      // Se não tem título, usar hash do código como fallback
      const contentHash = this.createHash(mermaidCode).substring(0, 12);
      return `mermaid-diagram-${contentHash}`;
    }
  }

  // Método para sanitizar título para usar como ID
  private sanitizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, ''); // Remove hífens do início e fim
  }

  // Método para criar hash único baseado no conteúdo
  private createHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Método para salvar diagrama no cache
  private saveCachedDiagram(diagramId: string, svgContent: string): void {
    try {
      const cacheKey = `mermaid_diagram_${diagramId}`;
      localStorage.setItem(cacheKey, svgContent);
      console.log(`Diagrama salvo no cache: ${diagramId}`);
    } catch (error) {
      console.warn('Erro ao salvar diagrama no cache:', error);
    }
  }

  // Método para recuperar diagrama do cache
  private getCachedDiagram(diagramId: string): string | null {
    try {
      const cacheKey = `mermaid_diagram_${diagramId}`;
      return localStorage.getItem(cacheKey);
    } catch (error) {
      console.warn('Erro ao recuperar diagrama do cache:', error);
      return null;
    }
  }

  // Método para remover diagrama do cache
  private removeCachedDiagram(diagramId: string): void {
    try {
      const cacheKey = `mermaid_diagram_${diagramId}`;
      localStorage.removeItem(cacheKey);
      console.log(`Diagrama removido do cache: ${diagramId}`);
    } catch (error) {
      console.warn('Erro ao remover diagrama do cache:', error);
    }
  }

  // Método para pré-carregar todos os markdowns e SVGs em segundo plano
  public async preloadAllMermaidDiagrams(): Promise<void> {
    console.log('🚀 Iniciando pré-carregamento completo em segundo plano...');

    // Verificar se Mermaid está disponível
    if (typeof mermaid === 'undefined') {
      console.error('❌ Mermaid não está disponível globalmente - abortando pré-carregamento');
      console.log('🔍 Tipo de mermaid:', typeof mermaid);
      console.log('🔍 window.mermaid:', typeof (window as any).mermaid);
      return;
    }

    console.log('✅ Mermaid está disponível - continuando pré-carregamento...');
    console.log('🔍 Mermaid version:', (mermaid as any).version || 'unknown');

    const projects = ['lol-matchmaking', 'aa_space', 'mercearia-r-v'];
    const allPromises = [];

    for (const project of projects) {
      console.log(`📁 Processando: ${project}`);

      try {
        const readmeFileName = this.getReadmeFileName(project);
        if (!readmeFileName) {
          console.warn(`⚠️ Arquivo README não encontrado para ${project}`);
          continue;
        }

        console.log(`📄 Lendo arquivo: ${readmeFileName}`);
        const readmePath = `assets/portfolio_md/${readmeFileName}`;
        const rawContent = await this.http.get(readmePath, { responseType: 'text' }).toPromise();

        if (rawContent) {
          console.log(`✅ Conteúdo lido para ${project}: ${rawContent.length} chars`);

          // 1. Extrair e gerar SVGs PRIMEIRO (do markdown raw)
          const mermaidCodes = this.extractMermaidCodesFromMarkdown(rawContent);
          console.log(`📊 Extraídos ${mermaidCodes.length} códigos Mermaid para ${project}`);

          if (mermaidCodes.length === 0) {
            console.warn(`⚠️ Nenhum código Mermaid encontrado em ${project}`);
            continue;
          }

          for (let i = 0; i < mermaidCodes.length; i++) {
            const mermaidCode = mermaidCodes[i];
            console.log(`🔍 Processando código Mermaid ${i + 1}/${mermaidCodes.length}`);

            const diagramTitle = this.extractMermaidTitle(mermaidCode);
            console.log(`📝 Título extraído: ${diagramTitle || 'Nenhum'}`);

            if (diagramTitle) {
              const diagramId = this.generateUniqueDiagramId(project, diagramTitle, mermaidCode);

              // Sempre gerar (cache será invalidado a cada refresh)
              console.log(`🎯 INICIANDO geração de SVG: ${diagramTitle} (ID: ${diagramId})`);
              console.log(`📝 Código Mermaid:`, mermaidCode.substring(0, 100) + '...');

              const renderPromise = this.renderMermaidToSvg(mermaidCode, diagramId, project)
                .then(svgContent => {
                  if (svgContent && svgContent.length > 0) {
                    console.log(`✅ SVG gerado com sucesso: ${diagramTitle} (${svgContent.length} chars)`);
                    return { diagramId, title: diagramTitle, success: true };
                  } else {
                    console.warn(`⚠️ Falha ao gerar SVG: ${diagramTitle} - conteúdo vazio ou nulo`);
                    return { diagramId, title: diagramTitle, success: false };
                  }
                })
                .catch(error => {
                  console.error(`❌ Erro ao gerar SVG ${diagramTitle}:`, error);
                  return { diagramId, title: diagramTitle, success: false };
                });
              allPromises.push(renderPromise);
            } else {
              console.warn(`⚠️ Pulando diagrama sem título explícito em ${project}`);
            }
          }
        } else {
          console.warn(`⚠️ Conteúdo vazio para ${project}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${project}:`, error);
      }
    }

    // Aguardar todos os SVGs serem gerados
    try {
      const results = await Promise.all(allPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`✅ SVGs gerados! Agora processando markdowns com SVGs...`);
      console.log(`   📊 SVGs gerados com sucesso: ${successful}`);
      console.log(`   ⚠️ SVGs com falha: ${failed}`);

      // 2. AGORA processar e cachear os markdowns com SVGs incluídos
      for (const project of projects) {
        try {
          const readmeFileName = this.getReadmeFileName(project);
          if (!readmeFileName) continue;

          const readmePath = `assets/portfolio_md/${readmeFileName}`;
          const rawContent = await this.http.get(readmePath, { responseType: 'text' }).toPromise();

          if (rawContent) {
            console.log(`📝 Processando markdown final para: ${project}`);
            const processedMarkdown = this.parseMarkdown(rawContent, project);

            // Verificar se os SVGs foram incluídos
            const svgCount = (processedMarkdown.match(/<svg/g) || []).length;
            const loadingCount = (processedMarkdown.match(/class="mermaid-loading"/g) || []).length;

            console.log(`📊 Markdown processado para ${project}:`);
            console.log(`   - SVGs incluídos: ${svgCount}`);
            console.log(`   - Ainda carregando: ${loadingCount}`);

            this.cache.set(project, processedMarkdown);
            console.log(`✅ Markdown processado e cacheado para: ${project}`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar markdown final para ${project}:`, error);
        }
      }

      console.log(`🎉 Pré-carregamento completo concluído!`);
      console.log(`   📝 Markdowns cacheados: ${projects.length}`);
      console.log(`   📊 SVGs gerados com sucesso: ${successful}`);
      console.log(`   ⚠️ SVGs com falha: ${failed}`);

      if (failed > 0) {
        console.log('❌ SVGs com falha:', results.filter(r => !r.success).map(r => r.title));
      }
    } catch (error) {
      console.error('❌ Erro durante pré-carregamento:', error);
    }
  }

  // Método para pré-renderizar diagramas Mermaid antes do modal abrir
  public async preRenderMermaidDiagrams(projectName: string): Promise<void> {
    console.log(`🚀 Pré-renderizando diagramas Mermaid para ${projectName}...`);

    // Limpar cache expirado primeiro
    this.cleanExpiredCache();

    // Gerenciar tamanho do cache
    this.manageCacheSize();

    // Carregar conteúdo README RAW primeiro para verificar quantos diagramas devem existir
    const readmeFileName = this.getReadmeFileName(projectName);
    if (!readmeFileName) {
      console.log(`❌ Arquivo README não encontrado para ${projectName}`);
      return;
    }

    const readmePath = `assets/portfolio_md/${readmeFileName}`;
    const rawContent = await this.http.get(readmePath, { responseType: 'text' }).toPromise();
    if (!rawContent) {
      console.log(`❌ Nenhum conteúdo README encontrado para ${projectName}`);
      return;
    }

    // Verificar quantos diagramas devem existir
    const expectedDiagrams = this.extractMermaidCodesFromMarkdown(rawContent);
    console.log(`📊 Esperados ${expectedDiagrams.length} diagramas para ${projectName}`);

    // Verificar se já tem cache válido para todos os diagramas esperados
    const existingDiagrams = Array.from(this.mermaidCache.keys()).filter(key => {
      const cacheData = this.mermaidCache.get(key);
      return cacheData && this.isCacheValid(cacheData.timestamp);
    });

    if (existingDiagrams.length >= expectedDiagrams.length && expectedDiagrams.length > 0) {
      console.log(`✅ Já existem ${existingDiagrams.length} diagramas em cache válido para ${projectName} (esperados: ${expectedDiagrams.length})`);
      return;
    }

    console.log(`🔄 Pré-renderizando ${expectedDiagrams.length - existingDiagrams.length} diagramas faltantes...`);

    // Usar os códigos já extraídos
    const mermaidCodes = expectedDiagrams;
    console.log(`🔍 Encontrados ${mermaidCodes.length} diagramas Mermaid para pré-renderizar`);

    if (mermaidCodes.length === 0) {
      console.log(`⚠️ Nenhum diagrama Mermaid encontrado para ${projectName}`);
      return;
    }

    // Pré-renderizar apenas diagramas que não estão em cache
    const renderPromises = [];
    for (let i = 0; i < mermaidCodes.length; i++) {
      const mermaidCode = mermaidCodes[i];

      // Extrair título e criar ID baseado no título e projeto
      const diagramTitle = this.extractMermaidTitle(mermaidCode);
      const diagramId = this.generateUniqueDiagramId(projectName, diagramTitle, mermaidCode);

      // Verificar se já está em cache válido
      const cacheData = this.mermaidCache.get(diagramId);
      if (cacheData && this.isCacheValid(cacheData.timestamp)) {
        console.log(`✅ Diagrama ${diagramTitle || 'Sem título'} já está em cache válido (ID: ${diagramId})`);
        continue; // Pular este diagrama
      }

      console.log(`🎯 Pré-renderizando diagrama ${i + 1}/${mermaidCodes.length}: ${diagramTitle || 'Sem título'} (ID: ${diagramId})`);

      const renderPromise = this.renderMermaidToSvg(mermaidCode, diagramId, projectName)
        .then(svgContent => {
          if (svgContent) {
            // O cache já foi salvo dentro do renderMermaidToSvg
            console.log(`✅ Diagrama ${diagramId} pré-renderizado com sucesso`);
            return { diagramId, success: true };
          } else {
            console.warn(`❌ Falha ao pré-renderizar diagrama ${diagramId}`);
            return { diagramId, success: false };
          }
        })
        .catch(error => {
          console.error(`❌ Erro ao pré-renderizar diagrama ${diagramId}:`, error);
          return { diagramId, success: false, error };
        });

      renderPromises.push(renderPromise);
    }

    // Se não há diagramas para renderizar (todos já estão em cache)
    if (renderPromises.length === 0) {
      console.log(`✅ Todos os diagramas já estão em cache válido para ${projectName}`);
      return;
    }

    // Aguardar todos os diagramas serem renderizados
    console.log(`⏳ Aguardando renderização de ${renderPromises.length} diagramas...`);
    const results = await Promise.all(renderPromises);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📊 Pré-renderização concluída para ${projectName}: ${successful} sucessos, ${failed} falhas`);

    // Verificar se todos os diagramas foram renderizados com sucesso
    if (successful === 0 && renderPromises.length > 0) {
      console.error(`❌ Nenhum diagrama foi renderizado com sucesso para ${projectName}`);
      throw new Error(`Falha na renderização de diagramas para ${projectName}`);
    }

    // Verificar cache de forma inteligente
    let allCached = false;
    let cacheAttempts = 0;
    const maxCacheAttempts = 10;

    while (!allCached && cacheAttempts < maxCacheAttempts) {
      cacheAttempts++;

      const cachedDiagrams = Array.from(this.mermaidCache.keys()).filter(key => {
        const cacheData = this.mermaidCache.get(key);
        return cacheData && this.isCacheValid(cacheData.timestamp) &&
          results.some(r => r.success && r.diagramId === key);
      });

      console.log(`🔍 Verificação ${cacheAttempts}/${maxCacheAttempts}: ${cachedDiagrams.length}/${successful} diagramas no cache`);

      if (cachedDiagrams.length === successful && successful > 0) {
        allCached = true;
        console.log(`✅ Todos os ${successful} diagramas confirmados no cache!`);
      } else {
        console.log(`⏳ Aguardando cache se estabilizar...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    if (!allCached) {
      console.warn(`⚠️ Timeout na verificação do cache após ${maxCacheAttempts} tentativas`);
    }

    // Reprocessar o markdown agora que os diagramas estão no cache
    console.log(`🔄 Reprocessando markdown com diagramas em cache...`);

    try {
      const readmeFileName = this.getReadmeFileName(projectName);
      if (!readmeFileName) {
        throw new Error(`Arquivo README não encontrado para ${projectName}`);
      }

      const readmePath = `assets/portfolio_md/${readmeFileName}`;
      const rawContent = await this.http.get(readmePath, { responseType: 'text' }).toPromise();

      if (!rawContent) {
        throw new Error(`Conteúdo README vazio para ${projectName}`);
      }

      // Reprocessar com diagramas já no cache
      let reprocessedContent = this.parseMarkdown(rawContent, projectName);

      // Verificar se os diagramas foram realmente incluídos
      const diagramCount = (reprocessedContent.match(/class="mermaid-content"/g) || []).length;
      const loadingCount = (reprocessedContent.match(/class="mermaid-loading"/g) || []).length;

      console.log(`📊 Verificação do reprocessamento:`);
      console.log(`  - Diagramas renderizados: ${diagramCount}`);
      console.log(`  - Diagramas ainda carregando: ${loadingCount}`);

      if (loadingCount > 0) {
        console.warn(`⚠️ Ainda há ${loadingCount} diagramas carregando após reprocessamento`);
        // Aguardar mais um pouco e tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));

        reprocessedContent = this.parseMarkdown(rawContent, projectName);
        const secondLoadingCount = (reprocessedContent.match(/class="mermaid-loading"/g) || []).length;

        if (secondLoadingCount > 0) {
          console.warn(`⚠️ Ainda há ${secondLoadingCount} diagramas carregando no segundo reprocessamento`);
          // Forçar indexação manual dos SVGs
          reprocessedContent = await this.forceIndexMermaidDiagrams(reprocessedContent);
        }
      }

      // Salvar conteúdo final no cache
      this.cache.set(projectName, reprocessedContent);
      console.log(`✅ Markdown reprocessado e salvo no cache para ${projectName}`);

    } catch (error) {
      console.error(`❌ Erro ao reprocessar markdown para ${projectName}:`, error);
      throw error;
    }
  }

  // Método para forçar indexação manual dos diagramas Mermaid
  private async forceIndexMermaidDiagrams(htmlContent: string): Promise<string> {
    console.log(`🔧 Forçando indexação manual dos diagramas Mermaid...`);

    // Encontrar todos os containers com data-mermaid-code
    const mermaidRegex = /<div class="mermaid-diagram"[^>]*data-mermaid-code="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi;

    let processedContent = htmlContent;
    let match;
    let indexCount = 0;

    while ((match = mermaidRegex.exec(htmlContent)) !== null) {
      const encodedCode = match[1];
      const mermaidCode = decodeURIComponent(encodedCode);
      const diagramHash = this.createHash(mermaidCode);
      const diagramId = `mermaid-diagram-${diagramHash}`;

      console.log(`🔍 Tentando indexar diagrama ${indexCount + 1}: ${diagramId}`);

      // Verificar se está no cache
      const cacheData = this.mermaidCache.get(diagramId);
      const cachedSvg = cacheData ? (this.isCacheValid(cacheData.timestamp) ? cacheData.svg : null) : this.getCachedDiagram(diagramId);

      if (cachedSvg) {
        console.log(`✅ SVG encontrado no cache para ${diagramId}, indexando...`);

        // Substituir o container com loading pelo SVG renderizado
        const replacementHtml = `<div class="mermaid-diagram" id="${diagramId}-container" style="margin: 1.5rem 0 !important; text-align: center !important; background: var(--bg-secondary) !important; border-radius: 8px !important; padding: 1rem !important; border: 1px solid var(--border-color) !important;">
                      <div class="mermaid-content" style="width: 100% !important; min-height: 200px !important; display: block !important; text-align: center !important; padding: 1rem !important;">${cachedSvg}</div>
                  </div>`;

        processedContent = processedContent.replace(match[0], replacementHtml);
        indexCount++;
        console.log(`✅ Diagrama ${indexCount} indexado com sucesso`);
      } else {
        console.warn(`⚠️ SVG não encontrado no cache para ${diagramId}`);
      }
    }

    console.log(`📊 Indexação concluída: ${indexCount} diagramas indexados`);
    return processedContent;
  }

  // Método para extrair códigos Mermaid do Markdown RAW
  private extractMermaidCodesFromMarkdown(markdownContent: string): string[] {
    const mermaidCodes: string[] = [];
    console.log('🔍 Extraindo códigos Mermaid do Markdown RAW...');
    console.log('📄 Markdown content preview:', markdownContent.substring(0, 500));

    // Regex para capturar blocos de código mermaid no markdown
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/gi;

    let match;
    let matchCount = 0;
    while ((match = mermaidRegex.exec(markdownContent)) !== null) {
      matchCount++;
      console.log(`🎯 Match ${matchCount} encontrado:`, match[0].substring(0, 150) + '...');

      const cleanCode = match[1].trim();

      console.log(`🧹 Código limpo ${matchCount}:`, cleanCode.substring(0, 150) + '...');
      console.log(`📏 Tamanho do código: ${cleanCode.length} caracteres`);

      if (cleanCode) {
        mermaidCodes.push(cleanCode);
        console.log(`✅ Código Mermaid ${matchCount} adicionado à lista`);

        // Verificar se é um diagrama válido
        if (cleanCode.includes('graph') || cleanCode.includes('flowchart') || cleanCode.includes('sequenceDiagram')) {
          console.log(`📊 Diagrama válido detectado: ${cleanCode.split('\n')[0]}`);
        } else {
          console.warn(`⚠️ Possível diagrama inválido: ${cleanCode.split('\n')[0]}`);
        }
      }
    }

    console.log(`📊 Total de códigos Mermaid extraídos: ${mermaidCodes.length}`);

    // Debug específico para Mercearia R-V
    if (markdownContent.includes('Mercearia') || markdownContent.includes('Electron Desktop App')) {
      console.log('🏪 Debug específico para Mercearia R-V:');
      console.log('🔍 Procurando por padrões específicos...');

      // Verificar se há blocos mermaid sem a classe correta
      const allCodeBlocks = markdownContent.match(/```[\w]*\s*\n[\s\S]*?\n```/gi);
      if (allCodeBlocks) {
        console.log(`📝 Total de blocos de código encontrados: ${allCodeBlocks.length}`);
        allCodeBlocks.forEach((block, index) => {
          if (block.includes('graph TB') || block.includes('Electron Desktop App')) {
            console.log(`🎯 Bloco ${index + 1} parece ser Mermaid:`, block.substring(0, 200) + '...');
          }
        });
      }
    }

    return mermaidCodes;
  }


  // Método para extrair códigos Mermaid do HTML
  private extractMermaidCodes(htmlContent: string): string[] {
    const mermaidCodes: string[] = [];
    console.log('🔍 Extraindo códigos Mermaid do HTML...');
    console.log('📄 HTML content preview:', htmlContent.substring(0, 500));

    // Regex mais flexível para capturar blocos mermaid
    const mermaidRegex = /<pre><code class="[^"]*\b(?:language-)?mermaid\b[^"]*">([\s\S]*?)<\/code><\/pre>/gi;

    let match;
    let matchCount = 0;
    while ((match = mermaidRegex.exec(htmlContent)) !== null) {
      matchCount++;
      console.log(`🎯 Match ${matchCount} encontrado:`, match[0].substring(0, 150) + '...');

      const cleanCode = match[1]
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();

      console.log(`🧹 Código limpo ${matchCount}:`, cleanCode.substring(0, 150) + '...');
      console.log(`📏 Tamanho do código: ${cleanCode.length} caracteres`);

      if (cleanCode) {
        mermaidCodes.push(cleanCode);
        console.log(`✅ Código Mermaid ${matchCount} adicionado à lista`);

        // Verificar se é um diagrama válido
        if (cleanCode.includes('graph') || cleanCode.includes('flowchart') || cleanCode.includes('sequenceDiagram')) {
          console.log(`📊 Diagrama válido detectado: ${cleanCode.split('\n')[0]}`);
        } else {
          console.warn(`⚠️ Possível diagrama inválido: ${cleanCode.split('\n')[0]}`);
        }
      }
    }

    console.log(`📊 Total de códigos Mermaid extraídos: ${mermaidCodes.length}`);

    // Debug específico para Mercearia R-V
    if (htmlContent.includes('Mercearia') || htmlContent.includes('Electron Desktop App')) {
      console.log('🏪 Debug específico para Mercearia R-V:');
      console.log('🔍 Procurando por padrões específicos...');

      // Verificar se há blocos mermaid sem a classe correta
      const allCodeBlocks = htmlContent.match(/<pre><code[^>]*>[\s\S]*?<\/code><\/pre>/gi);
      if (allCodeBlocks) {
        console.log(`📝 Total de blocos de código encontrados: ${allCodeBlocks.length}`);
        allCodeBlocks.forEach((block, index) => {
          if (block.includes('graph TB') || block.includes('Electron Desktop App')) {
            console.log(`🎯 Bloco ${index + 1} parece ser Mermaid:`, block.substring(0, 200) + '...');
          }
        });
      }
    }

    return mermaidCodes;
  }

  // Método para renderizar Mermaid para SVG em background
  private async renderMermaidToSvg(mermaidCode: string, diagramId: string, projectName?: string): Promise<string | null> {
    console.log(`🎨 Iniciando renderização do diagrama ${diagramId}`);
    console.log(`📝 Código Mermaid:`, mermaidCode.substring(0, 100) + '...');

    // Verificar se Mermaid está disponível
    if (typeof mermaid === 'undefined') {
      console.error(`❌ Mermaid não está disponível globalmente para ${diagramId}`);
      return null;
    }

    console.log(`✅ Mermaid está disponível para ${diagramId}`);

    try {
      // Criar container oculto
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.cssText = `
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 800px !important;
        height: 400px !important;
      `;

      // Criar div mermaid
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.id = diagramId;
      mermaidDiv.textContent = mermaidCode;

      hiddenContainer.appendChild(mermaidDiv);
      document.body.appendChild(hiddenContainer);

      console.log(`📦 Container criado e adicionado ao DOM para ${diagramId}`);

      // Aguardar estabilização
      await new Promise(resolve => setTimeout(resolve, 100));

      // Inicializar mermaid com configuração específica
      console.log(`🔧 Inicializando Mermaid para ${diagramId}...`);

      // Configurar mermaid para este diagrama específico
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Arial, sans-serif'
      });

      await mermaid.init(undefined, mermaidDiv);
      console.log(`✅ Mermaid inicializado para ${diagramId}`);

      // Aguardar renderização de forma inteligente
      let attempts = 0;
      const maxAttempts = 20;
      let generatedSvg: SVGElement | null = null;

      while (attempts < maxAttempts && !generatedSvg) {
        await new Promise(resolve => setTimeout(resolve, 100));
        generatedSvg = mermaidDiv.querySelector('svg');
        attempts++;

        if (!generatedSvg) {
          console.log(`⏳ Aguardando renderização... tentativa ${attempts}/${maxAttempts}`);
        }
      }

      if (generatedSvg) {
        console.log(`🎯 SVG gerado para ${diagramId} após ${attempts} tentativas:`, {
          viewBox: generatedSvg.getAttribute('viewBox'),
          hasContent: generatedSvg.innerHTML.length > 0,
          width: generatedSvg.getAttribute('width'),
          height: generatedSvg.getAttribute('height')
        });

        const svgClone = generatedSvg.cloneNode(true) as SVGSVGElement;

        // Aplicar estilos responsivos e otimizados
        svgClone.style.cssText = `
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
          width: 100% !important;
        `;

        // Configurar viewBox para responsividade
        const viewBox = svgClone.getAttribute('viewBox');
        if (viewBox) {
          svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }

        // Remover dimensões fixas se existirem
        svgClone.removeAttribute('width');
        svgClone.removeAttribute('height');

        const svgHtml = svgClone.outerHTML;
        console.log(`📋 SVG HTML gerado para ${diagramId}:`, svgHtml.length + ' caracteres');

        // Salvar no cache ANTES de limpar (com timestamp)
        const cacheData = { svg: svgHtml, timestamp: Date.now(), projectName: projectName || '' };
        this.mermaidCache.set(diagramId, cacheData);
        this.saveCachedDiagram(diagramId, svgHtml);
        console.log(`💾 SVG salvo no cache para ${diagramId} (válido por 24h)`);

        // Verificar se foi salvo corretamente
        const cachedData = this.mermaidCache.get(diagramId);
        if (cachedData && cachedData.svg.length > 0) {
          console.log(`✅ Cache confirmado para ${diagramId}: ${cachedData.svg.length} caracteres`);
        } else {
          console.error(`❌ Falha ao salvar no cache: ${diagramId}`);
          hiddenContainer.remove();
          return null;
        }

        // Limpar
        hiddenContainer.remove();
        console.log(`🧹 Container removido para ${diagramId}`);

        return svgHtml;
      } else {
        console.warn(`⚠️ SVG não foi gerado para ${diagramId} após ${maxAttempts} tentativas`);
        console.log(`🔍 Conteúdo do container:`, mermaidDiv.innerHTML);
      }

      hiddenContainer.remove();
      return null;
    } catch (error) {
      console.error(`❌ Erro ao renderizar Mermaid para SVG ${diagramId}:`, error);
      return null;
    }
  }

  // Método para indexar diagramas Mermaid no modal (modal invisível)
  public async indexMermaidDiagramsInModal(): Promise<void> {
    console.log('🔧 Indexando diagramas Mermaid no modal...');

    // Aguardar modal estar no DOM de forma inteligente
    let modalReady = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!modalReady && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));

      const modalContent = document.querySelector('.modal-content');
      if (modalContent) {
        modalReady = true;
        console.log(`✅ Modal pronto após ${attempts} tentativas`);
      } else {
        console.log(`⏳ Aguardando modal... tentativa ${attempts}/${maxAttempts}`);
      }
    }

    if (!modalReady) {
      console.error(`❌ Modal não ficou pronto após ${maxAttempts} tentativas`);
      return;
    }

    // Buscar containers de diagramas mermaid
    const containers = document.querySelectorAll('.mermaid-diagram[data-mermaid-code]');
    console.log(`🔍 Encontrados ${containers.length} diagramas Mermaid para indexar`);

    if (containers.length === 0) {
      console.log('✅ Nenhum diagrama pendente encontrado - todos já indexados');
      return;
    }

    let indexedCount = 0;
    for (const container of containers) {
      const success = await this.indexSingleMermaidDiagram(container);
      if (success) indexedCount++;

      // Pequena pausa entre indexações
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`✅ Indexação concluída: ${indexedCount}/${containers.length} diagramas indexados`);

    // Verificar se todos foram indexados
    const remainingContainers = document.querySelectorAll('.mermaid-diagram[data-mermaid-code]');
    if (remainingContainers.length === 0) {
      console.log(`✅ Todos os diagramas foram indexados com sucesso!`);
    } else {
      console.warn(`⚠️ Ainda há ${remainingContainers.length} diagramas pendentes`);
    }
  }

  // Método para indexar um único diagrama Mermaid
  private async indexSingleMermaidDiagram(container: Element): Promise<boolean> {
    const mermaidCode = decodeURIComponent(container.getAttribute('data-mermaid-code') || '');
    const diagramTitle = container.getAttribute('data-diagram-title') || '';
    const diagramId = container.id.replace('-container', '');
    const content = container.querySelector('.mermaid-content') as HTMLElement;
    const loading = container.querySelector('.mermaid-loading') as HTMLElement;

    console.log(`🔧 Tentando indexar diagrama ${diagramTitle || diagramId}...`);
    console.log(`  - Título: ${diagramTitle || 'Sem título'}`);
    console.log(`  - ID: ${diagramId}`);
    console.log(`  - Código Mermaid: ${mermaidCode.substring(0, 50)}...`);
    console.log(`  - Content element: ${content ? '✅' : '❌'}`);
    console.log(`  - Loading element: ${loading ? '✅' : '❌'}`);

    if (!content || !mermaidCode) {
      console.warn(`⚠️ Elementos não encontrados para ${diagramId}`);
      return false;
    }

    // Verificar se está no cache
    const cacheData = this.mermaidCache.get(diagramId);
    const cachedSvg = cacheData ? (this.isCacheValid(cacheData.timestamp) ? cacheData.svg : null) : this.getCachedDiagram(diagramId);

    console.log(`  - Cache em memória: ${this.mermaidCache.has(diagramId) ? '✅' : '❌'}`);
    console.log(`  - Cache válido: ${cacheData ? this.isCacheValid(cacheData.timestamp) ? '✅' : '❌ (expirado)' : '❌'}`);
    console.log(`  - Cache localStorage: ${this.getCachedDiagram(diagramId) ? '✅' : '❌'}`);
    console.log(`  - SVG encontrado: ${cachedSvg ? '✅ (' + cachedSvg.length + ' chars)' : '❌'}`);

    if (cachedSvg) {
      console.log(`✅ SVG encontrado no cache para ${diagramId}, aplicando...`);

      // Remover loading
      if (loading) {
        loading.remove();
        console.log(`🗑️ Elemento loading removido`);
      }

      // Inserir SVG renderizado
      content.innerHTML = cachedSvg;
      console.log(`📝 SVG inserido no content (${cachedSvg.length} chars)`);

      // Remover atributos para indicar que foi processado
      container.removeAttribute('data-mermaid-code');
      container.removeAttribute('data-diagram-title');
      console.log(`🏷️ Atributos removidos`);

      console.log(`✅ Diagrama ${diagramTitle || diagramId} indexado com sucesso`);
      return true;
    } else {
      console.warn(`⚠️ SVG não encontrado no cache para ${diagramId}`);
      return false;
    }
  }

  // Método para inserir SVG do cache com inteligência de posicionamento
  private insertCachedSvg(content: HTMLElement, loading: HTMLElement, svgContent: string, diagramId: string, container: Element): void {
    console.log(`📋 Inserindo SVG do cache para ${diagramId}`);

    // Remover indicador de loading
    if (loading) {
      loading.style.display = 'none';
    }

    // Inserir SVG com estilos responsivos
    content.innerHTML = svgContent;

    // Aplicar estilos responsivos ao SVG
    const svgElement = content.querySelector('svg');
    if (svgElement) {
      svgElement.style.cssText = `
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        margin: 0 auto !important;
        width: 100% !important;
      `;

      // Ajustar viewBox para responsividade se necessário
      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      // Habilitar controles após carregamento
      const controls = container.querySelector('.mermaid-controls') as HTMLElement;
      if (controls) {
        controls.style.opacity = '1';
        const buttons = controls.querySelectorAll('button');
        buttons.forEach(btn => {
          btn.disabled = false;
          btn.style.cursor = 'pointer';
          btn.style.opacity = '1';
        });
      }

      console.log(`✅ SVG inserido e estilizado para ${diagramId}`);
    } else {
      console.error(`❌ SVG não encontrado após inserção para ${diagramId}`);
    }
  }

  // Método público para renderizar diagramas mermaid quando o modal for aberto
  public async renderMermaidDiagrams(): Promise<void> {
    console.log('🚀 Iniciando renderização de diagramas Mermaid...');

    // Aguardar um pouco para o modal estar pronto
    await new Promise(resolve => setTimeout(resolve, 300));

    // Buscar containers de diagramas mermaid
    const containers = document.querySelectorAll('.mermaid-diagram[data-mermaid-code]');
    console.log(`🔍 Encontrados ${containers.length} diagramas Mermaid para renderizar`);

    if (containers.length === 0) {
      console.log('⚠️ Nenhum diagrama Mermaid encontrado');

      // Verificar se há diagramas já renderizados
      const renderedContainers = document.querySelectorAll('.mermaid-diagram');
      console.log(`📊 Total de containers de diagramas: ${renderedContainers.length}`);

      renderedContainers.forEach((container, index) => {
        const id = container.id;
        const hasSvg = container.querySelector('svg');
        console.log(`  ${index + 1}. ${id}: ${hasSvg ? '✅ SVG presente' : '❌ Sem SVG'}`);
      });

      return;
    }

    for (const container of containers) {
      console.log(`🎯 Processando container: ${container.id}`);
      await this.renderSingleMermaidDiagram(container);
    }

    console.log('✅ Renderização de diagramas Mermaid concluída');
  }

  // Método para renderizar um único diagrama Mermaid com inteligência de posicionamento
  private async renderSingleMermaidDiagram(container: Element): Promise<void> {
    const mermaidCode = decodeURIComponent(container.getAttribute('data-mermaid-code') || '');
    const diagramId = container.id.replace('-container', '');
    const projectName = container.getAttribute('data-project') || '';
    const content = container.querySelector('.mermaid-content') as HTMLElement;
    const loading = container.querySelector('.mermaid-loading') as HTMLElement;
    const controls = container.querySelector('.mermaid-controls') as HTMLElement;

    if (!content || !loading || !mermaidCode) {
      console.warn(`Elementos não encontrados para ${diagramId}`);
      return;
    }

    try {
      console.log(`🎯 Renderizando diagrama ${diagramId} para projeto ${projectName}`);

      // Verificar se já existe SVG renderizado no cache
      const cachedSvg = this.getCachedDiagram(diagramId);
      if (cachedSvg) {
        console.log(`✅ Usando SVG do cache para ${diagramId}`);
        this.insertCachedSvg(content, loading, cachedSvg, diagramId, container);
        return;
      }

      // Verificar estado inicial dos elementos
      console.log(`Estado inicial:`, {
        containerRect: (container as HTMLElement).getBoundingClientRect(),
        contentRect: content.getBoundingClientRect(),
        containerDisplay: getComputedStyle(container as HTMLElement).display,
        contentDisplay: getComputedStyle(content).display,
        loadingDisplay: getComputedStyle(loading).display
      });

      // Remover loading
      loading.remove();

      // Renderizar em elemento oculto para evitar "piscar"
      console.log(`Renderizando diagrama ${diagramId} em background...`);

      // Criar container oculto para renderização
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.cssText = `
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 800px !important;
        height: 400px !important;
      `;

      // Criar div mermaid dentro do container oculto
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.id = diagramId;
      mermaidDiv.textContent = mermaidCode;

      hiddenContainer.appendChild(mermaidDiv);
      document.body.appendChild(hiddenContainer);

      console.log(`Container oculto criado:`, {
        inDOM: document.contains(hiddenContainer),
        hidden: hiddenContainer.style.visibility
      });

      // Aguardar estabilização
      await new Promise(resolve => setTimeout(resolve, 100));

      // Inicializar mermaid no elemento oculto
      await mermaid.init(undefined, mermaidDiv);
      console.log(`Mermaid inicializado em background para ${diagramId}`);

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar se o SVG foi gerado
      const generatedSvg = mermaidDiv.querySelector('svg');
      if (generatedSvg) {
        console.log(`SVG gerado em background:`, {
          viewBox: generatedSvg.getAttribute('viewBox'),
          hasContent: generatedSvg.innerHTML.length > 0
        });

        // Clonar o SVG e aplicar estilos
        const svgClone = generatedSvg.cloneNode(true) as SVGSVGElement;
        svgClone.style.cssText = `
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
        `;

        // Inserir o SVG clonado no container correto
        content.innerHTML = '';
        content.appendChild(svgClone);

        // Remover container oculto
        hiddenContainer.remove();

        // Salvar no cache se funcionou
        const diagramId = mermaidDiv.id;
        if (diagramId) {
          const svgHtml = svgClone.outerHTML;
          // Salvar tanto no cache em memória quanto no localStorage (com timestamp)
          const cacheData = { svg: svgHtml, timestamp: Date.now(), projectName: projectName || '' };
          this.mermaidCache.set(diagramId, cacheData);
          this.saveCachedDiagram(diagramId, svgHtml);
        }

        // Aguardar um pouco para o DOM se estabilizar
        await new Promise(resolve => setTimeout(resolve, 100));

        const finalRect = svgClone.getBoundingClientRect();
        const computedStyle = getComputedStyle(svgClone);

        console.log(`SVG inserido no lugar correto:`, {
          inContent: content.contains(svgClone),
          svgVisible: finalRect.width > 0,
          finalRect: { width: finalRect.width, height: finalRect.height },
          computedStyle: {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            width: computedStyle.width,
            height: computedStyle.height
          },
          contentRect: content.getBoundingClientRect(),
          containerRect: (container as HTMLElement).getBoundingClientRect()
        });

        // Se ainda não está visível, aplicar estratégia mais agressiva
        if (finalRect.width === 0 || finalRect.height === 0) {
          console.log(`SVG ainda não visível, aplicando estratégia agressiva...`);

          // Remover todos os atributos que podem causar conflitos
          svgClone.removeAttribute('width');
          svgClone.removeAttribute('height');
          svgClone.removeAttribute('style');

          // Criar um novo elemento SVG limpo
          const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

          // Copiar todos os atributos importantes
          const viewBox = svgClone.getAttribute('viewBox');
          const xmlns = svgClone.getAttribute('xmlns');
          const id = svgClone.getAttribute('id');

          if (viewBox) newSvg.setAttribute('viewBox', viewBox);
          if (xmlns) newSvg.setAttribute('xmlns', xmlns);
          if (id) newSvg.setAttribute('id', id);

          // Copiar todo o conteúdo interno
          newSvg.innerHTML = svgClone.innerHTML;

          // Aplicar estilos agressivos no novo SVG
          newSvg.style.cssText = `
            width: 800px !important;
            height: 394px !important;
            max-width: 100% !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 auto !important;
            background: transparent !important;
          `;

          // Forçar estilos no container também
          content.style.cssText = `
            width: 100% !important;
            min-height: 200px !important;
            display: block !important;
            text-align: center !important;
            padding: 1rem !important;
            background: rgba(255, 255, 255, 0.02) !important;
            border-radius: 8px !important;
            border: 1px solid rgba(219, 194, 125, 0.2) !important;
            overflow-x: auto !important;
            overflow-y: visible !important;
          `;

          // Substituir o SVG problemático pelo novo
          content.innerHTML = '';
          content.appendChild(newSvg);

          console.log(`Novo SVG criado e inserido:`, {
            viewBox: newSvg.getAttribute('viewBox'),
            hasContent: newSvg.innerHTML.length > 0,
            newSvgStyle: newSvg.style.cssText
          });

          // Aguardar e verificar o novo SVG
          await new Promise(resolve => setTimeout(resolve, 200));
          const newRect = newSvg.getBoundingClientRect();
          console.log(`Dimensões do novo SVG:`, { width: newRect.width, height: newRect.height });

          // Se ainda não funcionou, tentar inserir diretamente no container pai
          if (newRect.width === 0 || newRect.height === 0) {
            console.log(`Novo SVG também sem dimensões, inserindo no container pai...`);

            const containerElement = container as HTMLElement;
            containerElement.innerHTML = '';
            containerElement.appendChild(newSvg);

            // Forçar estilos no container pai também
            containerElement.style.cssText = `
              margin: 1.5rem 0 !important;
              text-align: center !important;
              background: var(--bg-secondary) !important;
              border-radius: 8px !important;
              padding: 1rem !important;
              border: 1px solid var(--border-color) !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              width: 100% !important;
              min-height: 200px !important;
            `;

            await new Promise(resolve => setTimeout(resolve, 100));
            const finalRect = newSvg.getBoundingClientRect();
            console.log(`Dimensões finais no container pai:`, { width: finalRect.width, height: finalRect.height });

            // Se finalmente funcionou, salvar no cache
            if (finalRect.width > 0 && finalRect.height > 0) {
              const svgHtml = newSvg.outerHTML;
              const cacheData = { svg: svgHtml, timestamp: Date.now(), projectName: projectName || '' };
              this.mermaidCache.set(diagramId, cacheData);
              this.saveCachedDiagram(diagramId, svgHtml);
            }
          }
        }
      } else {
        console.warn(`SVG não foi gerado para ${diagramId}`);
        hiddenContainer.remove();
      }

      console.log(`Diagrama ${diagramId} renderizado com sucesso`);

      // Remover atributo para evitar re-renderização
      container.removeAttribute('data-mermaid-code');

    } catch (error) {
      console.error(`Erro ao renderizar diagrama ${diagramId}:`, error);
      content.innerHTML = `<div class="mermaid-error">
                <p>Erro ao renderizar diagrama: ${error}</p>
                        </div>`;
    }
  }

  // Método para configurar funções globais de controle dos diagramas
  public setupGlobalDiagramControls(): void {
    // Função global para download de SVG
    (window as any).downloadSVG = (diagramId: string, title: string) => {
      const container = document.getElementById(`${diagramId}-container`);
      if (!container) {
        console.error(`Container não encontrado para diagrama: ${diagramId}`);
        return;
      }

      const svgElement = container.querySelector('svg');
      if (!svgElement) {
        console.error(`SVG não encontrado no diagrama: ${diagramId}`);
        return;
      }

      // Clonar o SVG para evitar modificações no original
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

      // Adicionar metadados
      const titleElement = document.createElement('title');
      titleElement.textContent = title;
      svgClone.insertBefore(titleElement, svgClone.firstChild);

      const descElement = document.createElement('desc');
      descElement.textContent = `Diagrama Mermaid: ${title} - Gerado em ${new Date().toLocaleString()}`;
      svgClone.insertBefore(descElement, titleElement.nextSibling);

      // Converter para string
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Criar link de download
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${diagramId}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);

      console.log(`✅ SVG baixado: ${downloadLink.download}`);
    };

    // Função global para fullscreen
    (window as any).toggleFullscreen = (diagramId: string) => {
      const container = document.getElementById(`${diagramId}-container`);
      if (!container) {
        console.error(`Container não encontrado para diagrama: ${diagramId}`);
        return;
      }

      const svgElement = container.querySelector('svg');
      if (!svgElement) {
        console.error(`SVG não encontrado no diagrama: ${diagramId}`);
        return;
      }

      // Verificar se já está em fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }

      // Criar modal de fullscreen
      const fullscreenModal = document.createElement('div');
      fullscreenModal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.95) !important;
        z-index: 9999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
      `;

      const svgContainer = document.createElement('div');
      svgContainer.style.cssText = `
        max-width: 90vw !important;
        max-height: 90vh !important;
        background: var(--bg-secondary, #1a1a1a) !important;
        border-radius: 8px !important;
        padding: 2rem !important;
        position: relative !important;
        overflow: auto !important;
      `;

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        position: absolute !important;
        top: 0.5rem !important;
        right: 0.5rem !important;
        background: var(--color-accent, #ff6b35) !important;
        border: none !important;
        color: white !important;
        width: 2rem !important;
        height: 2rem !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        font-size: 1rem !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 10 !important;
      `;

      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      svgClone.style.cssText = `
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
      `;

      closeBtn.onclick = () => {
        document.body.removeChild(fullscreenModal);
      };

      fullscreenModal.onclick = (e) => {
        if (e.target === fullscreenModal) {
          document.body.removeChild(fullscreenModal);
        }
      };

      svgContainer.appendChild(closeBtn);
      svgContainer.appendChild(svgClone);
      fullscreenModal.appendChild(svgContainer);
      document.body.appendChild(fullscreenModal);

      console.log(`✅ Fullscreen ativado para diagrama: ${diagramId}`);
    };
  }

}
