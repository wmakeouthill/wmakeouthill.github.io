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
  // usar 1.0 como zoom padrão (100%)
  markdownZoom = 1.0;
  // Tema claro/escuro do modal (false = padrão escuro)
  isLightMode = false;

  constructor(
    private readonly markdownService: MarkdownService,
    public sanitizer: DomSanitizer,
    private readonly elementRef: ElementRef,
    private readonly renderer: Renderer2
  ) { }

  // Detectar se o navegador é Firefox (uso para fallback de zoom)
  isFirefox = false;

  ngAfterViewInit() {
    try {
      this.isFirefox = /firefox/i.test(navigator.userAgent);
    } catch (e) {
      this.isFirefox = false;
    }
  }

  ngOnInit() {
    // Não carregar aqui, apenas no ngOnChanges
  }

  ngOnDestroy() {
    // Garantir que o scroll seja reativado caso o componente seja destruído
    this.enableBodyScroll();
  }

  ngOnChanges(changes: any) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.disableBodyScroll();
        if (this.projectName) {
          // Sempre carregar o conteúdo específico do projeto
          console.log(`📄 Carregando conteúdo do cache para ${this.projectName}...`);
          this.loadReadmeFromCache();
        }
      } else {
        this.enableBodyScroll();
      }
    }
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;

    // Aplicar classe ao body do modal para estilos CSS
    const modalContent = this.elementRef.nativeElement.querySelector('.modal-content') as HTMLElement;
    if (modalContent) {
      if (this.isLightMode) {
        modalContent.classList.add('light-mode');
        // Aplicar variáveis inline para garantir prioridade sobre :root e estilos globais
        modalContent.style.setProperty('--bg-primary', '#f7f7f7');
        modalContent.style.setProperty('--bg-secondary', '#ffffff');
        modalContent.style.setProperty('--text-primary', '#0b1420');
        modalContent.style.setProperty('--text-secondary', '#333333');
        modalContent.style.setProperty('--border-color', 'rgba(0,0,0,0.06)');
      } else {
        modalContent.classList.remove('light-mode');
        // Remover overrides inline quando voltar ao modo escuro
        modalContent.style.removeProperty('--bg-primary');
        modalContent.style.removeProperty('--bg-secondary');
        modalContent.style.removeProperty('--text-primary');
        modalContent.style.removeProperty('--text-secondary');
        modalContent.style.removeProperty('--border-color');
      }
    }

    // Reajustar scroll/altura após troca de tema
    setTimeout(() => this.fixScrollHeight(), 80);
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
    console.log('📏 Calculando altura exata do conteúdo (usando medidas não escaladas)...');

    // Encontrar o último elemento com conteúdo real
    const lastElement = this.findLastElementWithContent(markdownContent);

    if (!lastElement) {
      console.log('⚠️ Não foi possível encontrar o último elemento');
      return;
    }

    // Usar medidas não escaladas (offsetTop/offsetHeight) que refletem o layout original
    const unscaledLastBottom = (lastElement as HTMLElement).offsetTop + (lastElement as HTMLElement).offsetHeight;
    const padding = 10; // pequena folga para evitar cortar conteúdo

    // Aplicar o fator de zoom ao valor não escalado para obter a altura final
    const finalHeight = Math.ceil(unscaledLastBottom * this.markdownZoom) + padding;

    console.log('📏 Altura calculada (não escalada -> escalada):');
    console.log(`  - Altura não escalada do conteúdo: ${unscaledLastBottom}px`);
    console.log(`  - Scale: ${this.markdownZoom}`);
    console.log(`  - Altura final aplicada: ${finalHeight}px`);
    console.log(`  - Altura atual do modal-body (scrollHeight): ${modalBody.scrollHeight}px`);

    // Aplicar a altura calculada somente se reduzir o espaço desnecessário
    if (finalHeight < modalBody.scrollHeight) {
      console.log(`🔧 Aplicando altura máxima: ${finalHeight}px`);
      this.renderer.setStyle(modalBody, 'max-height', `${finalHeight}px`);
      this.renderer.setStyle(modalBody, 'height', `${finalHeight}px`);
      // Não forçar scrollTop para evitar pular para o topo; posição será preservada externamente
    } else {
      console.log('✅ Altura atual já está correta');
    }
  }

  // Helper para preservar scroll proporcionalmente ao aplicar uma mudança (por ex. alterar zoom)
  private preserveScrollAndApply(changeFn: () => void) {
    const modalBody = this.elementRef.nativeElement.querySelector('.modal-body') as HTMLElement;
    if (!modalBody) {
      changeFn();
      // aplicar correção após mudança
      setTimeout(() => this.fixScrollHeight(), 50);
      return;
    }

    const maxScrollBefore = Math.max(0, modalBody.scrollHeight - modalBody.clientHeight);
    const ratio = maxScrollBefore > 0 ? modalBody.scrollTop / maxScrollBefore : 0;

    // Aplicar a mudança (ex.: alterar markdownZoom)
    changeFn();

    // Após o DOM reagir ao zoom, recalcular alturas e restaurar posição proporcional
    setTimeout(() => {
      this.fixScrollHeight();

      // pequena espera para que scrollHeight se estabilize
      setTimeout(() => {
        const maxScrollAfter = Math.max(0, modalBody.scrollHeight - modalBody.clientHeight);
        const newScrollTop = Math.round(ratio * maxScrollAfter);
        modalBody.scrollTop = newScrollTop;
      }, 80);
    }, 80);
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
      // Se este elemento estiver dentro de um <svg>, pular: defs, style, marker, circle, path etc são válidos dentro do SVG
      if (htmlElement.closest && htmlElement.closest('svg')) {
        return; // Pular qualquer elemento que pertença a um SVG para evitar quebrar o diagrama
      }

      if (tagName === 'svg' || (tagName === 'g' && rect.height > 0)) {
        return; // Pular elementos SVG principais (caso não tenha sido pego pelo closest)
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

  private disableBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${window.scrollY}px`;
  }

  private enableBodyScroll() {
    const scrollY = document.body.style.top;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  }

  closeModal() {
    this.enableBodyScroll();
    this.close.emit();
  }

  increaseZoom() {
    if (this.markdownZoom < 1.5) {
      this.preserveScrollAndApply(() => { this.markdownZoom = Math.round((this.markdownZoom + 0.1) * 10) / 10; });
    }
  }

  decreaseZoom() {
    if (this.markdownZoom > 0.5) {
      this.preserveScrollAndApply(() => { this.markdownZoom = Math.round((this.markdownZoom - 0.1) * 10) / 10; });
    }
  }

  resetZoom() {
    this.preserveScrollAndApply(() => { this.markdownZoom = 1.0; });
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
