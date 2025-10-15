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
  }

  getReadmeContent(projectName: string): Observable<string> {
    // Mapear nomes de projetos para arquivos markdown
    const readmeFileName = this.getReadmeFileName(projectName);

    if (!readmeFileName) {
      return of('');
    }

    const readmePath = `assets/portfolio_md/${readmeFileName}`;

    return this.http.get(readmePath, { responseType: 'text' })
      .pipe(
        map(content => this.parseMarkdown(content)),
        catchError(error => {
          console.error(`Erro ao carregar README para ${projectName}:`, error);
          return of('');
        })
      );
  }

  private getReadmeFileName(projectName: string): string | null {
    // Mapear nomes de repositórios para nomes de arquivos markdown
    const projectMappings: { [key: string]: string } = {
      'fazenda-inhouse': 'README - Fazenda inhouse.md',
      'lol-matchmaking': 'README - LOL Matchmaking.md',
      'lol-matchmaking-fazenda': 'README - LOL Matchmaking.md',
      'mercearia-r-v': 'README - Mercearia-R-V.md',
      // Adicione mais mapeamentos conforme necessário
    };

    // Tentar encontrar por nome exato
    if (projectMappings[projectName.toLowerCase()]) {
      return projectMappings[projectName.toLowerCase()];
    }

    // Tentar encontrar por nome similar
    const projectNameLower = projectName.toLowerCase();
    for (const [key, value] of Object.entries(projectMappings)) {
      if (projectNameLower.includes(key) || key.includes(projectNameLower)) {
        return value;
      }
    }

    return null;
  }

  private parseMarkdown(content: string): string {
    // Converter markdown para HTML usando marked
    const htmlContent = marked.parse(content) as string;
    console.log('HTML gerado pelo marked:', htmlContent.substring(0, 500) + '...');

    // Processar primeiro os diagramas mermaid (antes dos code blocks)
    let processedContent = this.processMermaidDiagrams(htmlContent);
    console.log('Após processar Mermaid:', processedContent.substring(0, 500) + '...');

    // Depois processar code blocks normais
    processedContent = this.processCodeBlocks(processedContent);
    console.log('Após processar Code Blocks:', processedContent.substring(0, 500) + '...');

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

        return `<div class="code-block">
                    <div class="code-header">
                        <span class="code-language">text</span>
                        <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${cleanCode.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')">📋</button>
                    </div>
                    <pre><code>${cleanCode}</code></pre>
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

  private processMermaidDiagrams(htmlContent: string): string {
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

        // Criar hash único baseado no conteúdo do diagrama
        const diagramHash = this.createHash(cleanDiagramCode);
        const diagramId = `mermaid-diagram-${diagramHash}`;

        // Verificar se já existe no cache
        const cachedSvg = this.getCachedDiagram(diagramId);

        if (cachedSvg) {
          console.log(`Usando diagrama do cache: ${diagramId}`);
          return `<div class="mermaid-diagram" id="${diagramId}-container" style="margin: 1.5rem 0 !important; text-align: center !important; background: var(--bg-secondary) !important; border-radius: 8px !important; padding: 1rem !important; border: 1px solid var(--border-color) !important;">
                      <div class="mermaid-content" style="width: 100% !important; min-height: 200px !important; display: block !important; text-align: center !important; padding: 1rem !important;">${cachedSvg}</div>
                  </div>`;
        } else {
          console.log(`Diagrama não encontrado no cache, será renderizado: ${diagramId}`);
          // Retornar container que será processado quando o modal for aberto
          return `<div class="mermaid-diagram" id="${diagramId}-container" data-mermaid-code="${encodeURIComponent(cleanDiagramCode)}" style="margin: 1.5rem 0 !important; text-align: center !important; background: var(--bg-secondary) !important; border-radius: 8px !important; padding: 1rem !important; border: 1px solid var(--border-color) !important;">
                    <div class="mermaid-loading" style="color: var(--color-accent) !important; font-style: italic !important; padding: 1rem !important;">Carregando diagrama...</div>
                      <div class="mermaid-content" style="width: 100% !important; min-height: 200px !important; display: block !important; text-align: center !important; padding: 1rem !important;"></div>
                </div>`;
        }
      } catch (error) {
        console.error('Erro ao processar diagrama mermaid:', error);
        return `<div class="mermaid-error">Erro ao processar diagrama: ${error}</div>`;
      }
    });

    return processedContent;
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

  // Método público para renderizar diagramas mermaid quando o modal for aberto
  public async renderMermaidDiagrams(): Promise<void> {
    console.log('Iniciando renderização de diagramas Mermaid...');

    // Aguardar um pouco para o modal estar pronto
    await new Promise(resolve => setTimeout(resolve, 500));

    // Buscar containers de diagramas mermaid
    const containers = document.querySelectorAll('.mermaid-diagram[data-mermaid-code]');
    console.log(`Encontrados ${containers.length} diagramas Mermaid para renderizar`);

    if (containers.length === 0) {
      console.log('Nenhum diagrama Mermaid encontrado');
      return;
    }

    for (const container of containers) {
      await this.renderSingleMermaidDiagram(container);
    }

    console.log('Renderização de diagramas Mermaid concluída');
  }

  // Método para renderizar um único diagrama Mermaid com abordagem simples
  private async renderSingleMermaidDiagram(container: Element): Promise<void> {
    const mermaidCode = decodeURIComponent(container.getAttribute('data-mermaid-code') || '');
    const diagramId = container.id.replace('-container', '');
    const content = container.querySelector('.mermaid-content') as HTMLElement;
    const loading = container.querySelector('.mermaid-loading') as HTMLElement;

    if (!content || !loading || !mermaidCode) {
      console.warn(`Elementos não encontrados para ${diagramId}`);
      return;
    }

    try {
      console.log(`Renderizando diagrama ${diagramId}`);

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




}
