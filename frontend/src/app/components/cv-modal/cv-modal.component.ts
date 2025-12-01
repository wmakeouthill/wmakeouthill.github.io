import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';
import { CertificationsService } from '../../services/certifications.service';

@Component({
  selector: 'app-cv-modal',
  standalone: true,
  imports: [CommonModule, PdfViewerComponent],
  templateUrl: './cv-modal.component.html',
  styleUrl: './cv-modal.component.css'
})
export class CvModalComponent implements OnInit, OnChanges, OnDestroy {
  private readonly certificationsService = inject(CertificationsService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  /** Zoom do PDF (1.0 = 100%) */
  pdfZoom = 1.0;

  /** Rotação do PDF no modal (em graus: 0, 90, 180, 270) */
  pdfRotation = 0;

  /** Estado do drag para scroll */
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  scrollStartX = 0;
  scrollStartY = 0;

  /** Nome do arquivo para download */
  readonly cvFileName = 'Wesley de Carvalho Augusto Correia - Currículo.pdf';

  /** URL do currículo no GitHub (para abrir externamente) */
  readonly cvGitHubUrl = signal<string | null>(null);

  /** Loading state */
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loadCurriculoMetadata();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.disableBodyScroll();
      } else {
        this.enableBodyScroll();
      }
    }
  }

  /**
   * Retorna a URL do PDF do currículo (servido pelo backend)
   */
  getCurriculoPdfUrl(): string {
    return this.certificationsService.getCurriculoPdfUrl();
  }

  /**
   * Carrega os metadados do currículo para obter a URL do GitHub
   */
  private loadCurriculoMetadata(): void {
    this.loading.set(true);

    this.certificationsService.loadCurriculo().subscribe({
      next: (curriculo) => {
        if (curriculo) {
          this.cvGitHubUrl.set(curriculo.htmlUrl);
          console.log('✅ Metadados do currículo carregados');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar metadados do currículo:', err);
        this.loading.set(false);
      }
    });
  }

  private disableBodyScroll(): void {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.setAttribute('data-scroll-y', scrollY.toString());
  }

  private enableBodyScroll(): void {
    const scrollY = document.body.getAttribute('data-scroll-y');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.removeAttribute('data-scroll-y');
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY));
    }
  }

  increaseZoom(): void {
    if (this.pdfZoom < 2.0) {
      this.pdfZoom = Math.round((this.pdfZoom + 0.1) * 10) / 10;
    }
  }

  decreaseZoom(): void {
    if (this.pdfZoom > 0.5) {
      this.pdfZoom = Math.round((this.pdfZoom - 0.1) * 10) / 10;
    }
  }

  resetZoom(): void {
    this.pdfZoom = 1.0;
  }

  /**
   * Rotaciona o PDF 90 graus no sentido horário
   */
  rotatePdf(): void {
    this.pdfRotation = (this.pdfRotation + 90) % 360;
  }

  closeModal(): void {
    this.enableBodyScroll();
    this.close.emit();
  }

  downloadCV(): void {
    const link = document.createElement('a');
    link.href = this.getCurriculoPdfUrl();
    link.download = this.cvFileName;
    link.target = '_blank';
    link.click();
  }

  openInGitHub(): void {
    const url = this.cvGitHubUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  onMouseWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0 && this.pdfZoom < 2.0) {
        this.increaseZoom();
      } else if (event.deltaY > 0 && this.pdfZoom > 0.5) {
        this.decreaseZoom();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAG TO SCROLL (arrastar para mover o PDF)
  // ─────────────────────────────────────────────────────────────────────────────

  onDragStart(event: MouseEvent): void {
    const container = event.currentTarget as HTMLElement;
    // Só ativa drag se houver scroll disponível
    if (container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight) {
      this.isDragging = true;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.scrollStartX = container.scrollLeft;
      this.scrollStartY = container.scrollTop;
      container.style.cursor = 'grabbing';
      event.preventDefault();
    }
  }

  onDragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const container = event.currentTarget as HTMLElement;
    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;
    container.scrollLeft = this.scrollStartX - deltaX;
    container.scrollTop = this.scrollStartY - deltaY;
  }

  onDragEnd(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      const container = event.currentTarget as HTMLElement;
      container.style.cursor = 'grab';
    }
  }

  ngOnDestroy(): void {
    this.enableBodyScroll();
  }
}
