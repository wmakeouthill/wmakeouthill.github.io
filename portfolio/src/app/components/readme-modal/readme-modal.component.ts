import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  selector: 'app-readme-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './readme-modal.component.html',
  styleUrls: ['./readme-modal.component.css']
})
export class ReadmeModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() projectName = '';
  @Input() visible = true;
  @Output() close = new EventEmitter<void>();

  readmeContent: string = '';
  loadingReadme = false;
  markdownZoom = 0.9;

  constructor(
    private readonly markdownService: MarkdownService,
    public sanitizer: DomSanitizer,
    private readonly elementRef: ElementRef,
    private readonly renderer: Renderer2
  ) { }

  ngOnInit() {
    // Não carregar aqui, apenas no ngOnChanges
  }

  ngOnDestroy() {
    // Limpeza se necessário
  }

  ngOnChanges(changes: any) {
    if (changes['isOpen'] && this.isOpen && this.projectName) {
      // Sempre carregar o conteúdo específico do projeto
      console.log(`📄 Carregando conteúdo do cache para ${this.projectName}...`);
      this.loadReadmeFromCache();
    }
  }

  private loadReadmeFromCache() {
    this.loadingReadme = true;
    this.readmeContent = '';

    // Carregar conteúdo (já foi pré-renderizado com diagramas em cache)
    this.markdownService.forceUpdateReadmeContent(this.projectName).subscribe({
      next: (content) => {
        this.readmeContent = content;
        this.loadingReadme = false;

        // Log simples - a indexação será feita pelo componente pai
        console.log('📄 Conteúdo carregado no modal, aguardando indexação...');

        // Corrigir scroll após o conteúdo ser renderizado
        setTimeout(() => {
          this.fixScrollHeight();
        }, 100);
      },
      error: (error) => {
        console.error('❌ Erro ao carregar README atualizado:', error);
        this.loadingReadme = false;
      }
    });
  }

  private fixScrollHeight() {
    const modalBody = this.elementRef.nativeElement.querySelector('.modal-body');
    const markdownContent = this.elementRef.nativeElement.querySelector('.markdown-content');

    if (modalBody && markdownContent) {
      console.log('🔍 Iniciando correção de altura do scroll...');

      // Limpar elementos invisíveis primeiro
      this.cleanInvisibleElements(markdownContent);

      // Aguardar um frame para garantir que o DOM foi atualizado
      requestAnimationFrame(() => {
        this.calculateExactHeight(modalBody, markdownContent);
      });
    }
  }

  private calculateExactHeight(modalBody: HTMLElement, markdownContent: HTMLElement) {
    console.log('📏 Calculando altura exata do conteúdo...');

    // Obter todas as informações necessárias
    const modalBodyRect = modalBody.getBoundingClientRect();
    const markdownRect = markdownContent.getBoundingClientRect();

    // Encontrar o último elemento com conteúdo real
    const lastElement = this.findLastElementWithContent(markdownContent);

    if (!lastElement) {
      console.log('⚠️ Não foi possível encontrar o último elemento');
      return;
    }

    const lastElementRect = lastElement.getBoundingClientRect();

    console.log('📊 Informações dos elementos:');
    console.log(`  - Modal body top: ${modalBodyRect.top}px`);
    console.log(`  - Markdown content top: ${markdownRect.top}px`);
    console.log(`  - Last element bottom: ${lastElementRect.bottom}px`);
    console.log(`  - Scale: ${this.markdownZoom}`);

    // Calcular a altura necessária baseada na posição do último elemento
    // Como o scale é aplicado ao markdown-content, precisamos considerar isso
    const contentTop = markdownRect.top;
    const contentBottom = lastElementRect.bottom;
    const actualContentHeight = contentBottom - contentTop;

    // Adicionar apenas uma pequena margem (10px) para evitar scroll desnecessário
    const finalHeight = actualContentHeight + 10;

    console.log(`📏 Altura calculada:`);
    console.log(`  - Altura real do conteúdo: ${actualContentHeight}px`);
    console.log(`  - Altura final com margem: ${finalHeight}px`);
    console.log(`  - Altura atual do modal-body: ${modalBody.scrollHeight}px`);

    // Aplicar a altura calculada se for menor que a atual
    if (finalHeight < modalBody.scrollHeight) {
      console.log(`🔧 Aplicando altura máxima: ${finalHeight}px`);
      this.renderer.setStyle(modalBody, 'max-height', `${finalHeight}px`);
      this.renderer.setStyle(modalBody, 'height', `${finalHeight}px`);

      // Forçar o scroll para o topo para garantir que não há scroll desnecessário
      modalBody.scrollTop = 0;
    } else {
      console.log(`✅ Altura atual já está correta`);
    }
  }

  private findLastElementWithContent(container: HTMLElement): HTMLElement | null {
    // Buscar elementos em ordem de prioridade (do mais específico para o mais geral)
    const selectors = [
      'h1, h2, h3, h4, h5, h6', // Títulos
      'p', // Parágrafos
      'ul, ol', // Listas
      'pre', // Blocos de código
      'blockquote', // Citações
      'table', // Tabelas
      '.mermaid-diagram', // Diagramas Mermaid
      'svg', // SVGs (diagramas)
      'div', // Divs genéricos
      'span' // Spans genéricos
    ];

    let lastElement: HTMLElement | null = null;
    let maxBottom = 0;

    selectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(element => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();

        // Verificar se o elemento tem conteúdo visível
        if (rect.height > 0 && rect.width > 0 && rect.top > 0) {
          const textContent = htmlElement.textContent?.trim();
          const hasVisibleContent = textContent && textContent.length > 0;

          // Para SVGs, verificar se têm elementos filhos visíveis
          const isSvg = htmlElement.tagName.toLowerCase() === 'svg';
          const hasSvgContent = isSvg && htmlElement.children.length > 0;

          if (hasVisibleContent || hasSvgContent) {
            if (rect.bottom > maxBottom) {
              maxBottom = rect.bottom;
              lastElement = htmlElement;
            }
          }
        }
      });
    });

    console.log(`🎯 Último elemento encontrado:`, lastElement ? (lastElement as HTMLElement).tagName : 'nenhum', lastElement ? (lastElement as HTMLElement).textContent?.substring(0, 50) || '' : '');
    return lastElement;
  }


  private cleanInvisibleElements(container: HTMLElement) {
    // Remover elementos vazios ou invisíveis, mas preservar elementos SVG importantes
    const emptyElements = container.querySelectorAll('*');
    emptyElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const tagName = htmlElement.tagName.toLowerCase();

      // Não remover elementos SVG principais (svg, g com conteúdo)
      if (tagName === 'svg' || (tagName === 'g' && rect.height > 0)) {
        return; // Pular elementos SVG importantes
      }

      // Remover elementos HTML invisíveis (exceto SVG internos)
      if (rect.height === 0 && rect.width === 0 &&
        !tagName.startsWith('svg') && tagName !== 'g' && tagName !== 'rect' &&
        tagName !== 'path' && tagName !== 'foreignobject') {
        console.log(`🗑️ Removendo elemento invisível:`, htmlElement.tagName);
        htmlElement.remove();
      }

      // Remover elementos vazios (exceto SVG internos)
      if (htmlElement.textContent && htmlElement.textContent.trim() === '' &&
        !tagName.startsWith('svg') && tagName !== 'g' && tagName !== 'rect' &&
        tagName !== 'path' && tagName !== 'foreignobject') {
        console.log(`🗑️ Removendo elemento vazio:`, htmlElement.tagName);
        htmlElement.remove();
      }
    });

    // Remover espaços extras no final
    const allElements = container.querySelectorAll('*');
    if (allElements.length > 0) {
      const lastElement = allElements[allElements.length - 1] as HTMLElement;
      if (lastElement) {
        // Remover margens e padding do último elemento
        this.renderer.setStyle(lastElement, 'margin-bottom', '0px');
        this.renderer.setStyle(lastElement, 'padding-bottom', '0px');
        console.log(`🔧 Removendo espaços do último elemento:`, lastElement.tagName);
      }
    }
  }


  private loadReadme() {
    this.loadingReadme = true;
    this.readmeContent = '';

    this.markdownService.getReadmeContent(this.projectName).subscribe({
      next: (content) => {
        this.readmeContent = content;
        this.loadingReadme = false;

        // Renderizar diagramas Mermaid após o conteúdo ser inserido no DOM
        setTimeout(() => {
          this.markdownService.renderMermaidDiagrams();
        }, 100);
      },
      error: (error) => {
        console.error('Erro ao carregar README:', error);
        this.loadingReadme = false;
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  increaseZoom() {
    if (this.markdownZoom < 1.5) {
      this.markdownZoom += 0.1;
      // Corrigir scroll após mudança de zoom
      setTimeout(() => {
        this.fixScrollHeight();
      }, 50);
    }
  }

  decreaseZoom() {
    if (this.markdownZoom > 0.5) {
      this.markdownZoom -= 0.1;
      // Corrigir scroll após mudança de zoom
      setTimeout(() => {
        this.fixScrollHeight();
      }, 50);
    }
  }

  resetZoom() {
    this.markdownZoom = 0.9;
    // Corrigir scroll após reset de zoom
    setTimeout(() => {
      this.fixScrollHeight();
    }, 50);
  }

  onMouseWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.increaseZoom();
      } else {
        this.decreaseZoom();
      }
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey) {
      switch (event.key) {
        case '=':
        case '+':
          event.preventDefault();
          this.increaseZoom();
          break;
        case '-':
          event.preventDefault();
          this.decreaseZoom();
          break;
        case '0':
          event.preventDefault();
          this.resetZoom();
          break;
      }
    }

    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
