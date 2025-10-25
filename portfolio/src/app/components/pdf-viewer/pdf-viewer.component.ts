import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Usaremos import dinâmico de pdfjs-dist para evitar problemas no build server
@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.css']
})
export class PdfViewerComponent implements OnChanges, AfterViewInit {
  @Input() src = '';
  @Input() zoom = 1.0; // 1.0 = 100%
  loading = true;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLDivElement>;

  private pdf: any = null;
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

  private async loadPdf() {
    if (!this.src) return;
    this.loading = true;
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
    const page = await this.pdf.getPage(this.pageNumber);

    // determinar scale desejado com otimização para mobile
    let targetScale = this.zoom === 1.0 ? 1.5 : this.zoom * 1.5;

    // Otimização para mobile: reduzir escala base em telas pequenas
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      targetScale = this.zoom === 1.0 ? 1.2 : this.zoom * 1.2;
    }

    // Otimização adicional para telas muito pequenas
    const isSmallMobile = window.innerWidth <= 480;
    if (isSmallMobile) {
      targetScale = this.zoom === 1.0 ? 1.0 : this.zoom * 1.0;
    }

    const viewport = page.getViewport({ scale: targetScale });
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d');
    if (!context) return;

    // high-DPI support com otimização para mobile
    const outputScale = window.devicePixelRatio || 1;
    // Reduzir escala de output em mobile para melhor performance
    const finalOutputScale = isMobile ? Math.min(outputScale, 1.5) : outputScale;

    canvas.width = Math.floor(viewport.width * finalOutputScale);
    canvas.height = Math.floor(viewport.height * finalOutputScale);
    // CSS size (keeps it fitting inside container)
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    // ensure crisp rendering on HiDPI
    context.setTransform(finalOutputScale, 0, 0, finalOutputScale, 0, 0);

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
    this.loading = false;
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
