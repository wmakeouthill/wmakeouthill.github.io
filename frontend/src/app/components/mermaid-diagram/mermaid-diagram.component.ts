import { Component, Input, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import mermaid from 'mermaid';

@Component({
    selector: 'app-mermaid-diagram',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="mermaid-diagram" [class.loading]="loading" [class.error]="error">
      @if (loading) {
        <div class="loading-message">
          <div class="spinner"></div>
          <span>Carregando diagrama...</span>
        </div>
      }

      @if (error) {
        <div class="error-message">
          <p>Erro ao renderizar diagrama:</p>
          <details>
            <summary>Detalhes do erro</summary>
            <pre>{{ error }}</pre>
          </details>
        </div>
      }

      @if (svgContent && !loading && !error) {
        <div class="diagram-container" [innerHTML]="svgContent"></div>
      }
    </div>
  `,
    styles: [`
    .mermaid-diagram {
      margin: 1.5rem 0;
      text-align: center;
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid var(--border-color);
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--color-accent);
      font-style: italic;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--border-color);
      border-top: 2px solid var(--color-accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      color: #ff6b6b;
      text-align: left;
    }

    .error-message pre {
      background: rgba(255, 0, 0, 0.1);
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      margin-top: 0.5rem;
    }

    .diagram-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .diagram-container svg {
      max-width: 100%;
      height: auto;
      display: block;
    }

    .mermaid-diagram.loading {
      background: var(--bg-secondary);
    }

    .mermaid-diagram.error {
      background: rgba(255, 0, 0, 0.05);
      border-color: rgba(255, 0, 0, 0.3);
    }
  `]
})
export class MermaidDiagramComponent implements OnInit, OnDestroy {
    @Input() diagramCode: string = '';
    @Input() diagramId: string = '';

    loading = true;
    error: string | null = null;
    svgContent: string | null = null;

    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer2
    ) { }

    ngOnInit() {
        if (this.diagramCode && this.diagramId) {
            this.renderDiagram();
        }
    }

    ngOnDestroy() {
        // Limpeza se necessário
    }

    private async renderDiagram() {
        try {
            this.loading = true;
            this.error = null;

            console.log(`Renderizando diagrama ${this.diagramId} com componente Angular`);

            // Aguardar um frame para garantir que o componente está no DOM
            await new Promise(resolve => requestAnimationFrame(resolve));

            // Criar elemento temporário para renderização
            const tempDiv = this.renderer.createElement('div');
            this.renderer.addClass(tempDiv, 'mermaid');
            this.renderer.setProperty(tempDiv, 'textContent', this.diagramCode);
            this.renderer.setAttribute(tempDiv, 'id', this.diagramId);

            // Renderizar com mermaid
            const result = await mermaid.render(this.diagramId, this.diagramCode);

            console.log(`SVG gerado para ${this.diagramId}, tamanho: ${result.svg.length} chars`);

            // Definir o conteúdo SVG
            this.svgContent = result.svg;
            this.loading = false;

            console.log(`Diagrama ${this.diagramId} renderizado com sucesso`);

        } catch (error) {
            console.error(`Erro ao renderizar diagrama ${this.diagramId}:`, error);
            this.error = error instanceof Error ? error.message : String(error);
            this.loading = false;
        }
    }
}
