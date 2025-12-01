import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ElementRef,
  viewChild
} from '@angular/core';
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
export class ReadmeModalComponent implements OnDestroy {
  private readonly markdownService = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);

  // Inputs usando nova sintaxe
  readonly isOpen = input<boolean>(false);
  readonly projectName = input<string>('');
  readonly visible = input<boolean>(true);

  // Output usando nova sintaxe
  readonly close = output<void>();

  // ViewChild com nova sintaxe
  readonly markdownContent = viewChild<ElementRef>('markdownContent');

  // Estado interno com signals
  readonly readmeContent = signal<SafeHtml>('');
  readonly loadingReadme = signal<boolean>(false);
  readonly markdownZoom = signal<number>(1.0);
  readonly rawMarkdown = signal<string>('');
  readonly isLightMode = signal<boolean>(false);

  // Computed para exibir zoom formatado
  readonly zoomDisplay = computed(() => {
    const zoom = this.markdownZoom();
    return zoom === 1 ? 'Auto' : `${Math.round(zoom * 100)}%`;
  });

  // Computed para verificar se tem conteúdo
  readonly hasContent = computed(() => {
    const content = this.readmeContent();
    return content !== '' && content !== null;
  });

  constructor() {
    // Effect que reage às mudanças de isOpen
    effect(() => {
      const open = this.isOpen();
      const project = this.projectName();

      if (open && project) {
        this.loadFromCacheOrFetch(project);
        this.disableBodyScroll();
      } else {
        this.enableBodyScroll();
      }
    });
  }

  ngOnDestroy(): void {
    this.enableBodyScroll();
  }

  private async loadFromCacheOrFetch(project: string): Promise<void> {
    if (!project) return;

    // Verifica cache primeiro - se existir, mostra instantaneamente
    const cached = this.markdownService.getReadmeContentSync(project);

    if (cached) {
      // Conteúdo já em cache - mostra instantaneamente sem loading
      console.log(`⚡ README de ${project} carregado do cache instantaneamente!`);
      this.readmeContent.set(this.sanitizer.bypassSecurityTrustHtml(cached));
      this.loadingReadme.set(false);

      // Setup code blocks após render
      setTimeout(() => this.setupCodeBlocks(), 50);

      // Carrega raw markdown em background para download
      this.loadRawMarkdownBackground(project);
      return;
    }

    // Não está no cache - precisa carregar (mostra loading)
    this.loadingReadme.set(true);
    console.log(`📥 Carregando README de ${project} do servidor...`);

    try {
      const html = await this.markdownService.preloadProject(project);
      this.readmeContent.set(html ? this.sanitizer.bypassSecurityTrustHtml(html) : '');
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      this.readmeContent.set('');
    } finally {
      this.loadingReadme.set(false);
      setTimeout(() => this.setupCodeBlocks(), 100);
      this.loadRawMarkdownBackground(project);
    }
  }

  private async loadRawMarkdownBackground(project: string): Promise<void> {
    try {
      const normalized = project.toLowerCase();
      const backendUrl = `/api/projects/${normalized}/markdown`;

      try {
        const response = await fetch(backendUrl);
        if (response.ok) {
          this.rawMarkdown.set(await response.text());
          return;
        }
      } catch {
        // Backend não disponível, tenta assets locais
      }

      const projectFile = this.markdownService.mapProjectToFile(project);
      if (projectFile) {
        const response = await fetch(`/assets/portfolio_md/${projectFile}`);
        if (response.ok) {
          this.rawMarkdown.set(await response.text());
        }
      }
    } catch (error) {
      console.error('Erro ao carregar markdown raw:', error);
    }
  }

  private setupCodeBlocks(): void {
    const contentEl = this.markdownContent()?.nativeElement;
    if (!contentEl) return;

    // Aplicar syntax highlighting com PrismJS
    if (typeof (window as any).Prism !== 'undefined') {
      const codeBlocks = contentEl.querySelectorAll('pre code');
      codeBlocks.forEach((codeBlock: HTMLElement) => {
        (window as any).Prism.highlightElement(codeBlock);

        if (!codeBlock.className.includes('language-')) {
          const language = this.detectLanguage(codeBlock.textContent || '');
          codeBlock.className = `language-${language}`;
          (window as any).Prism.highlightElement(codeBlock);
        }
      });
    }

    // Configurar botões de copiar
    const copyButtons = contentEl.querySelectorAll('.copy-btn');
    copyButtons.forEach((btn: HTMLButtonElement) => {
      (btn as any).copyCode = () => {
        const codeElement = btn.closest('pre')?.querySelector('code');
        const codeText = codeElement?.textContent || '';
        navigator.clipboard.writeText(codeText).then(() => {
          const spanEl = btn.querySelector('span');
          if (!spanEl) return;

          const originalText = spanEl.textContent;
          spanEl.textContent = 'Copiado!';
          btn.style.background = 'rgba(34, 197, 94, 0.2)';
          btn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
          btn.style.color = '#22c55e';

          setTimeout(() => {
            spanEl.textContent = originalText;
            btn.style.background = '#f7fafc';
            btn.style.borderColor = '#e2e8f0';
            btn.style.color = '#2d3748';
          }, 2000);
        });
      };
    });

    this.setupMermaidButtons();
  }

  private setupMermaidButtons(): void {
    const contentEl = this.markdownContent()?.nativeElement;
    if (!contentEl) return;

    // Configurar botões de download
    const downloadButtons = contentEl.querySelectorAll('.mermaid-download-btn');
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
    const fullscreenButtons = contentEl.querySelectorAll('.mermaid-fullscreen-btn');
    fullscreenButtons.forEach((btn: HTMLButtonElement) => {
      (btn as any).openMermaidFullscreen = (diagramId: string) => {
        this.openMermaidFullscreen(diagramId);
      };
    });
  }

  private openMermaidFullscreen(diagramId: string): void {
    const diagramContainer = document.getElementById(`${diagramId}-container`);
    const mermaidContent = diagramContainer?.querySelector('.mermaid-content');
    const svgElement = mermaidContent?.querySelector('svg');
    if (!svgElement) return;

    const svgRect = svgElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth * 0.8;
    const viewportHeight = window.innerHeight * 0.7;

    let initialScale = 1;
    if (svgRect.width > 0 && svgRect.height > 0) {
      const scaleX = viewportWidth / svgRect.width;
      const scaleY = viewportHeight / svgRect.height;
      initialScale = Math.min(scaleX, scaleY, 1);
    }

    const fullscreenModal = document.createElement('div');
    fullscreenModal.className = 'mermaid-fullscreen-modal';

    const content = document.createElement('div');
    content.className = 'mermaid-fullscreen-content';

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

    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomLevel);
    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(resetBtn);

    header.appendChild(title);
    header.appendChild(zoomControls);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'mermaid-fullscreen-body';

    const svgContainer = document.createElement('div');
    svgContainer.className = 'mermaid-svg-container';
    svgContainer.style.transform = `scale(${initialScale})`;
    svgContainer.appendChild(svgElement);

    body.appendChild(svgContainer);
    content.appendChild(header);
    content.appendChild(body);
    fullscreenModal.appendChild(content);

    const style = document.createElement('style');
    style.textContent = this.getMermaidFullscreenStyles();

    document.head.appendChild(style);
    document.body.appendChild(fullscreenModal);

    let currentScale = initialScale;
    const minScale = 0.1;
    const maxScale = 5.0;
    const scaleStep = 0.1;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    const svgContainerEl = fullscreenModal.querySelector('.mermaid-svg-container') as HTMLElement;
    const zoomLevelEl = fullscreenModal.querySelector('.mermaid-zoom-level') as HTMLElement;

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

    zoomOutBtn.addEventListener('click', zoomOut);
    zoomInBtn.addEventListener('click', zoomIn);
    resetBtn.addEventListener('click', resetZoom);

    const closeFullscreen = () => {
      mermaidContent?.appendChild(svgElement);
      document.body.removeChild(fullscreenModal);
      document.head.removeChild(style);
    };

    closeBtn.addEventListener('click', closeFullscreen);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
      updateZoom(currentScale + delta);
    };

    body.addEventListener('wheel', handleWheel, { passive: false });
    svgContainerEl.addEventListener('mousedown', startDrag);
    svgContainerEl.addEventListener('mousemove', drag);
    svgContainerEl.addEventListener('mouseup', endDrag);
    svgContainerEl.addEventListener('mouseleave', endDrag);

    const updateCursor = () => {
      svgContainerEl.style.cursor = 'grab';
    };

    updateZoom = (newScale: number) => {
      currentScale = Math.max(minScale, Math.min(maxScale, newScale));
      updateTransform();
      zoomLevelEl.textContent = `${Math.round(currentScale * 100)}%`;
      updateCursor();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFullscreen();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    fullscreenModal.addEventListener('click', (e) => {
      if (e.target === fullscreenModal) {
        closeFullscreen();
        document.removeEventListener('keydown', handleKeyDown);
      }
    });
  }

  private getMermaidFullscreenStyles(): string {
    return `
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
  }

  increaseZoom(): void {
    if (this.markdownZoom() < 1.5) {
      this.markdownZoom.update(z => z + 0.1);
      this.applyZoom();
    }
  }

  decreaseZoom(): void {
    if (this.markdownZoom() > 0.7) {
      this.markdownZoom.update(z => z - 0.1);
      this.applyZoom();
    }
  }

  resetZoom(): void {
    this.markdownZoom.set(1.0);
    this.applyZoom();
  }

  private applyZoom(): void {
    const el = this.markdownContent()?.nativeElement;
    if (el) {
      el.style.fontSize = `${this.markdownZoom()}em`;
      el.style.setProperty('--md-scale', String(this.markdownZoom()));
    }
  }

  toggleTheme(): void {
    this.isLightMode.update(v => !v);
    const el = this.markdownContent()?.nativeElement;
    if (!el) return;

    if (this.isLightMode()) {
      el.classList.add('light-mode');
    } else {
      el.classList.remove('light-mode');
    }
  }

  private detectLanguage(code: string): string {
    if (code.includes('function') && code.includes('=>')) return 'javascript';
    if (code.includes('import ') && code.includes('from ')) return 'javascript';
    if (code.includes('console.log')) return 'javascript';
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('import ') && code.includes('as ')) return 'python';
    if (code.includes('class ') && code.includes('{')) return 'java';
    if (code.includes('public static void main')) return 'java';
    if (code.includes('<html') || code.includes('<div')) return 'html';
    if (code.includes('SELECT ') || code.includes('FROM ')) return 'sql';
    if (code.includes('{') && code.includes('}') && code.includes('color:')) return 'css';
    return 'text';
  }

  downloadMarkdown(): void {
    const raw = this.rawMarkdown();
    if (!raw) return;

    const blob = new Blob([raw], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.projectName()}-README.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  onMouseWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0 && this.markdownZoom() < 1.5) {
        this.increaseZoom();
      } else if (event.deltaY > 0 && this.markdownZoom() > 0.7) {
        this.decreaseZoom();
      }
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  private disableBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private enableBodyScroll(): void {
    document.body.style.overflow = '';
  }
}
