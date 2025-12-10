import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Usaremos import dinâmico de pdfjs-dist para evitar problemas no build server
@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.css']
})
export class PdfViewerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() src = '';
  @Input() zoom = 1.0; // 1.0 = 100%
  loading = true;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLDivElement>;

  private pdf: any = null;
  private currentRenderTask: any = null;
  private pageNumber = 1;
  // Não aplicar fit automático por padrão; 1.0 === 100% exatamente.
  @Input() fitToContainer = false;

  ngAfterViewInit() {
    this.loadPdf();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src'] && !changes['src'].firstChange) {
      this.loadPdf();
    }
    if (changes['zoom'] && !changes['zoom'].firstChange) {
      this.renderPage();
    }
  }

  ngOnDestroy() {
    this.cancelRender();
    if (this.pdf && this.pdf.destroy) {
      this.pdf.destroy();
    }
  }

  private async loadPdf() {
    if (!this.src) return;
    this.loading = true;
    // cancela render anterior se houver
    this.cancelRender();
    if (this.pdf && this.pdf.destroy) {
      this.pdf.destroy();
      this.pdf = null;
    }
    // Preferimos usar o pacote instalado `pdfjs-dist` via import dinâmico. Se o import falhar
    // (por exemplo em ambientes estranhos), faremos fallback para CDN unpkg.
    try {
      // Import dinâmico ESM — evita problemas com 'require' em bundlers modernos
      // @ts-ignore: import dinâmica de caminho interno do pdfjs (resolvido em tempo de execução)
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
      // define worker local (deve existir em public/assets — postinstall tenta copiar)
      // @ts-ignore
      pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

      const loadingTask = pdfjs.getDocument(this.src);
      this.pdf = await loadingTask.promise;
      this.pageNumber = 1;
      await this.renderPage();
      this.loading = false;
      return;
    } catch (importErr) {
      console.error('Erro ao carregar pdfjs via import dinâmico:', importErr);
      // Se falhar, informa ao usuário (console) e rethrow para que o modal consiga lidar.
      this.loading = false;
      throw importErr;
    }
  }

  private async renderPage() {
    if (!this.pdf) return;
    this.loading = true;
    // cancela render em progresso
    this.cancelRender();
    const page = await this.pdf.getPage(this.pageNumber);

    // Obter viewport inicial para calcular proporções
    const initialViewport = page.getViewport({ scale: 1.0 });
    const pdfWidth = initialViewport.width;
    const pdfHeight = initialViewport.height;

    // Calcular escala baseada no container disponível
    // Subir na hierarquia para encontrar o pdf-container
    let container = this.rootRef.nativeElement.parentElement;
    while (container && !container.classList.contains('pdf-container')) {
      container = container.parentElement;
    }

    let targetScale = 1.5; // escala padrão

    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
      const containerWidth = container.clientWidth - 32; // padding
      const containerHeight = container.clientHeight - 32;

      // Calcular escala para caber na largura
      const scaleToFitWidth = containerWidth / pdfWidth;
      // Calcular escala para caber na altura
      const scaleToFitHeight = containerHeight / pdfHeight;

      // Usar a MAIOR escala que ainda caiba (prioriza ocupar mais espaço)
      // mas garantindo que não ultrapasse nenhuma dimensão
      const baseScale = Math.min(scaleToFitWidth, scaleToFitHeight);

      // Aplicar zoom do usuário sobre a escala base
      targetScale = baseScale * this.zoom;

      // Garantir limites razoáveis (0.5 a 4.0 para permitir zoom até 200%)
      targetScale = Math.max(0.5, Math.min(4.0, targetScale));
    } else {
      // Fallback baseado no tamanho da tela
      const screenWidth = window.innerWidth;

      if (screenWidth <= 480) {
        targetScale = this.zoom * 1.0;
      } else if (screenWidth <= 768) {
        targetScale = this.zoom * 1.3;
      } else if (screenWidth <= 1024) {
        targetScale = this.zoom * 1.5;
      } else {
        targetScale = this.zoom * 1.8;
      }
    }

    const viewport = page.getViewport({ scale: targetScale });
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d');
    if (!context) return;

    // high-DPI support com otimização
    const outputScale = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth <= 768;
    const finalOutputScale = isMobile ? Math.min(outputScale, 2) : outputScale;

    canvas.width = Math.floor(viewport.width * finalOutputScale);
    canvas.height = Math.floor(viewport.height * finalOutputScale);

    // CSS size - tamanho visual do canvas
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    // ensure crisp rendering on HiDPI
    context.setTransform(finalOutputScale, 0, 0, finalOutputScale, 0, 0);

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    const renderTask = page.render(renderContext);
    this.currentRenderTask = renderTask;
    try {
      await renderTask.promise;
    } finally {
      this.currentRenderTask = null;
      this.loading = false;
    }
  }

  private cancelRender() {
    if (this.currentRenderTask && this.currentRenderTask.cancel) {
      try {
        this.currentRenderTask.cancel();
      } catch { /* ignore */ }
    }
    this.currentRenderTask = null;
  }

  async nextPage() {
    if (!this.pdf) return;
    if (this.pageNumber < this.pdf.numPages) {
      this.pageNumber++;
      await this.renderPage();
    }
  }

  async prevPage() {
    if (!this.pdf) return;
    if (this.pageNumber > 1) {
      this.pageNumber--;
      await this.renderPage();
    }
  }
}
