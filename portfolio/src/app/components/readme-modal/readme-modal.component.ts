import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy, AfterViewInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  selector: 'app-readme-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './readme-modal.component.html',
  styleUrls: ['./readme-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ReadmeModalComponent implements OnChanges, AfterViewInit {
  @Input() isOpen = false;
  @Input() projectName = '';
  @Input() visible = true;
  @Output() close = new EventEmitter<void>();

  @ViewChild('markdownContent', { static: false }) markdownContent!: ElementRef;

  readmeContent: SafeHtml = '';
  loadingReadme = false;
  markdownZoom = 1.0;
  rawMarkdown = '';

  constructor(
    private readonly markdownService: MarkdownService,
    private readonly sanitizer: DomSanitizer
  ) { }

  ngOnChanges(changes: any) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.loadFromCache();
        this.disableBodyScroll();
      } else {
        this.enableBodyScroll();
      }
    }
  }

  ngAfterViewInit() {
    if (this.isOpen) {
      this.setupCodeBlocks();
    }
  }

  private loadFromCache() {
    if (!this.projectName || this.loadingReadme) return;
    this.loadingReadme = true;
    const cached = this.markdownService.getReadmeContentSync(this.projectName);
    this.readmeContent = cached ? this.sanitizer.bypassSecurityTrustHtml(cached) : '';
    this.loadingReadme = false;

    // Carregar markdown raw para download
    this.loadRawMarkdown();

    // Setup code blocks após carregar
    setTimeout(() => this.setupCodeBlocks(), 100);
  }

  private async loadRawMarkdown() {
    try {
      const projectFile = this.markdownService.mapProjectToFile(this.projectName);
      const response = await fetch(`/assets/portfolio_md/${projectFile}`);
      this.rawMarkdown = await response.text();
    } catch (error) {
      console.error('Erro ao carregar markdown raw:', error);
    }
  }

  private setupCodeBlocks() {
    if (!this.markdownContent?.nativeElement) return;

    // Aplicar syntax highlighting com PrismJS
    if (typeof (window as any).Prism !== 'undefined') {
      const codeBlocks = this.markdownContent.nativeElement.querySelectorAll('pre code');
      codeBlocks.forEach((codeBlock: HTMLElement) => {
        (window as any).Prism.highlightElement(codeBlock);
      });
    }

    // Configurar botões de copiar
    const copyButtons = this.markdownContent.nativeElement.querySelectorAll('.copy-btn');
    copyButtons.forEach((btn: HTMLButtonElement) => {
      (btn as any).copyCode = () => {
        const codeElement = btn.closest('pre')?.querySelector('code');
        const codeText = codeElement?.textContent || '';
        navigator.clipboard.writeText(codeText).then(() => {
          const originalText = btn.querySelector('span')!.textContent;
          btn.querySelector('span')!.textContent = 'Copiado!';
          btn.style.background = 'rgba(34, 197, 94, 0.2)';
          btn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
          btn.style.color = '#22c55e';

          setTimeout(() => {
            btn.querySelector('span')!.textContent = originalText;
            btn.style.background = '#f7fafc';
            btn.style.borderColor = '#e2e8f0';
            btn.style.color = '#2d3748';
          }, 2000);
        });
      };
    });

    // Configurar botões de Mermaid
    this.setupMermaidButtons();
  }

  private setupMermaidButtons() {
    if (!this.markdownContent?.nativeElement) return;

    // Configurar botões de download
    const downloadButtons = this.markdownContent.nativeElement.querySelectorAll('.mermaid-download-btn');
    downloadButtons.forEach((btn: HTMLButtonElement) => {
      (btn as any).downloadMermaid = (diagramId: string) => {
        const diagramContainer = document.getElementById(`${diagramId}-container`);
        const mermaidContent = diagramContainer?.querySelector('.mermaid-content');
        const svgElement = mermaidContent?.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${diagramId}.svg`;
          link.click();
          URL.revokeObjectURL(url);
        }
      };
    });

    // Configurar botões de fullscreen
    const fullscreenButtons = this.markdownContent.nativeElement.querySelectorAll('.mermaid-fullscreen-btn');
    fullscreenButtons.forEach((btn: HTMLButtonElement) => {
      (btn as any).openMermaidFullscreen = (diagramId: string) => {
        this.openMermaidFullscreen(diagramId);
      };
    });
  }

  private openMermaidFullscreen(diagramId: string) {
    const diagramContainer = document.getElementById(`${diagramId}-container`);
    const mermaidContent = diagramContainer?.querySelector('.mermaid-content');
    const svgElement = mermaidContent?.querySelector('svg');
    if (!svgElement) return;

    // Calcular tamanho inicial baseado no SVG
    const svgRect = svgElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth * 0.8;
    const viewportHeight = window.innerHeight * 0.7;

    // Calcular escala inicial para caber na viewport
    let initialScale = 1;
    if (svgRect.width > 0 && svgRect.height > 0) {
      const scaleX = viewportWidth / svgRect.width;
      const scaleY = viewportHeight / svgRect.height;
      initialScale = Math.min(scaleX, scaleY, 1);
    }

    console.log('SVG dimensions:', svgRect);
    console.log('Viewport dimensions:', viewportWidth, viewportHeight);
    console.log('Initial scale:', initialScale);

    // Criar modal de fullscreen
    const fullscreenModal = document.createElement('div');
    fullscreenModal.className = 'mermaid-fullscreen-modal';

    // Criar estrutura do modal
    const content = document.createElement('div');
    content.className = 'mermaid-fullscreen-content';

    // Header
    const header = document.createElement('div');
    header.className = 'mermaid-fullscreen-header';

    const title = document.createElement('h3');
    title.textContent = diagramId.replace(/-/g, ' ').toUpperCase();

    const zoomControls = document.createElement('div');
    zoomControls.className = 'mermaid-zoom-controls';

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'mermaid-zoom-btn';
    zoomOutBtn.title = 'Diminuir zoom';
    zoomOutBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>';

    const zoomLevel = document.createElement('span');
    zoomLevel.className = 'mermaid-zoom-level';
    zoomLevel.textContent = `${Math.round(initialScale * 100)}%`;

    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'mermaid-zoom-btn';
    zoomInBtn.title = 'Aumentar zoom';
    zoomInBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'mermaid-reset-btn';
    resetBtn.title = 'Redefinir zoom e posição';
    resetBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'mermaid-fullscreen-close';
    closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

    // Montar header
    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomLevel);
    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(resetBtn);

    header.appendChild(title);
    header.appendChild(zoomControls);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'mermaid-fullscreen-body';

    const svgContainer = document.createElement('div');
    svgContainer.className = 'mermaid-svg-container';
    svgContainer.style.transform = `scale(${initialScale})`;

    // Mover o SVG existente para o fullscreen (não clonar)
    svgContainer.appendChild(svgElement);

    body.appendChild(svgContainer);

    // Montar modal
    content.appendChild(header);
    content.appendChild(body);
    fullscreenModal.appendChild(content);

    // Adicionar estilos inline
    const style = document.createElement('style');
    style.textContent = `
      .mermaid-fullscreen-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        padding: 1rem;
      }
      .mermaid-fullscreen-content {
        background: #1a1a1a;
        border-radius: 12px;
        width: 100%;
        max-width: 95vw;
        max-height: 95vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      .mermaid-fullscreen-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: #2a2a2a;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        gap: 1rem;
      }
      .mermaid-fullscreen-header h3 {
        color: #DBC27D;
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        flex: 1;
      }
      .mermaid-zoom-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        padding: 0.5rem;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .mermaid-zoom-btn,
      .mermaid-reset-btn {
        background: linear-gradient(135deg, #DBC27D, #C9A96E);
        color: #000000;
        border: none;
        padding: 0.4rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(219, 194, 125, 0.3);
        width: 32px;
        height: 32px;
      }
      .mermaid-zoom-btn:hover,
      .mermaid-reset-btn:hover {
        background: linear-gradient(135deg, #C9A96E, #B8965F);
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(219, 194, 125, 0.4);
      }
      .mermaid-zoom-level {
        color: #DBC27D;
        font-weight: 600;
        font-size: 0.9rem;
        min-width: 3rem;
        text-align: center;
        font-family: 'Fira Code', monospace;
      }
      .mermaid-fullscreen-close {
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.2);
        color: #dc3545;
        padding: 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .mermaid-fullscreen-close:hover {
        background: rgba(220, 53, 69, 0.2);
        transform: translateY(-1px);
      }
      .mermaid-fullscreen-body {
        flex: 1;
        overflow: auto;
        padding: 1rem;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
      }
      .mermaid-svg-container {
        transition: transform 0.1s ease-out;
        transform-origin: center center;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        min-height: 400px;
        user-select: none;
        cursor: grab;
      }
      .mermaid-svg-container svg {
        max-width: none;
        max-height: none;
        width: auto;
        height: auto;
        display: block;
        background: transparent;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(fullscreenModal);

    // Variáveis de controle de zoom e pan
    let currentScale = initialScale;
    const minScale = 0.1;
    const maxScale = 5.0;
    const scaleStep = 0.1;

    // Variáveis de pan (arrastar)
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    const svgContainerEl = fullscreenModal.querySelector('.mermaid-svg-container') as HTMLElement;
    const zoomLevelEl = fullscreenModal.querySelector('.mermaid-zoom-level') as HTMLElement;

    // Funções de zoom e pan
    const updateTransform = () => {
      svgContainerEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    };

    let updateZoom = (newScale: number) => {
      currentScale = Math.max(minScale, Math.min(maxScale, newScale));
      updateTransform();
      zoomLevelEl.textContent = `${Math.round(currentScale * 100)}%`;
    };

    const zoomIn = () => updateZoom(currentScale + scaleStep);
    const zoomOut = () => updateZoom(currentScale - scaleStep);
    const resetZoom = () => {
      translateX = 0;
      translateY = 0;
      updateZoom(initialScale);
    };

    // Funções de pan (arrastar)
    const startDrag = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;

      svgContainerEl.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const drag = (e: MouseEvent) => {
      if (!isDragging) return;

      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    };

    const endDrag = () => {
      isDragging = false;
      svgContainerEl.style.cursor = 'grab';
    };

    // Configurar event listeners nos botões
    zoomOutBtn.addEventListener('click', zoomOut);
    zoomInBtn.addEventListener('click', zoomIn);
    resetBtn.addEventListener('click', resetZoom);

    const closeFullscreen = () => {
      // Devolver o SVG ao container original
      mermaidContent?.appendChild(svgElement);

      // Remover o modal
      document.body.removeChild(fullscreenModal);
      document.head.removeChild(style);
    };

    closeBtn.addEventListener('click', closeFullscreen);

    // Configurar wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
      updateZoom(currentScale + delta);
    };

    body.addEventListener('wheel', handleWheel, { passive: false });

    // Configurar drag no container do SVG
    svgContainerEl.addEventListener('mousedown', startDrag);
    svgContainerEl.addEventListener('mousemove', drag);
    svgContainerEl.addEventListener('mouseup', endDrag);
    svgContainerEl.addEventListener('mouseleave', endDrag);

    // Configurar cursor sempre como grab
    const updateCursor = () => {
      svgContainerEl.style.cursor = 'grab';
    };

    // Atualizar função de zoom para incluir cursor
    updateZoom = (newScale: number) => {
      currentScale = Math.max(minScale, Math.min(maxScale, newScale));
      updateTransform();
      zoomLevelEl.textContent = `${Math.round(currentScale * 100)}%`;
      updateCursor();
    };

    // Fechar com ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFullscreen();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Fechar clicando fora
    fullscreenModal.addEventListener('click', (e) => {
      if (e.target === fullscreenModal) {
        closeFullscreen();
        document.removeEventListener('keydown', handleKeyDown);
      }
    });
  }

  increaseZoom() {
    if (this.markdownZoom < 1.5) {
      this.markdownZoom += 0.1;
      this.applyZoom();
    }
  }

  decreaseZoom() {
    if (this.markdownZoom > 0.7) {
      this.markdownZoom -= 0.1;
      this.applyZoom();
    }
  }

  resetZoom() {
    this.markdownZoom = 1.0;
    this.applyZoom();
  }

  private applyZoom() {
    if (this.markdownContent?.nativeElement) {
      this.markdownContent.nativeElement.style.fontSize = `${this.markdownZoom}em`;
    }
  }

  downloadMarkdown() {
    if (!this.rawMarkdown) return;

    const blob = new Blob([this.rawMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.projectName}-README.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  onMouseWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0 && this.markdownZoom < 1.5) {
        this.increaseZoom();
      } else if (event.deltaY > 0 && this.markdownZoom > 0.7) {
        this.decreaseZoom();
      }
    }
  }

  closeModal() {
    this.enableBodyScroll();
    this.close.emit();
  }

  private disableBodyScroll() {
    // Salva a posição atual do scroll
    const scrollY = window.scrollY;

    // Aplica estilos para bloquear o scroll sem mover a página
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';

    // Salva a posição para restaurar depois
    document.body.setAttribute('data-scroll-y', scrollY.toString());
  }

  private enableBodyScroll() {
    // Recupera a posição salva
    const scrollY = document.body.getAttribute('data-scroll-y');

    // Remove os estilos de bloqueio
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.removeAttribute('data-scroll-y');

    // Restaura a posição do scroll no próximo frame de renderização
    if (scrollY) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(scrollY));
      });
    }
  }
}


