import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CertificationsService, CertificadoPdf } from '../../services/certifications.service';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';

@Component({
  selector: 'app-certifications',
  standalone: true,
  imports: [CommonModule, PdfViewerComponent],
  templateUrl: './certifications.component.html',
  styleUrl: './certifications.component.css'
})
export class CertificationsComponent implements OnInit {
  private readonly certificationsService = inject(CertificationsService);

  /** Lista de certificados (sem o currículo) */
  readonly certificados = this.certificationsService.certificados;

  /** Estado de loading */
  readonly loading = this.certificationsService.loading;

  /** Mensagem de erro */
  readonly error = this.certificationsService.error;

  /** Certificado selecionado para visualização */
  readonly selectedCertificado = signal<CertificadoPdf | null>(null);

  /** Controle do modal de visualização */
  readonly isModalOpen = signal(false);

  /** Zoom do PDF no modal */
  pdfZoom = 1.0;

  /** Rotação do PDF no modal (em graus: 0, 90, 180, 270) */
  pdfRotation = 0;

  /** Estado do drag para scroll */
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  scrollStartX = 0;
  scrollStartY = 0;

  ngOnInit(): void {
    this.certificationsService.loadCertificados().subscribe();
  }

  /**
   * Abre o modal com o certificado selecionado
   */
  openCertificado(cert: CertificadoPdf): void {
    this.selectedCertificado.set(cert);
    this.isModalOpen.set(true);
    this.pdfZoom = 1.0;
    this.pdfRotation = 0;
    this.disableBodyScroll();
  }

  /**
   * Fecha o modal
   */
  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedCertificado.set(null);
    this.enableBodyScroll();
  }

  /**
   * Retorna a URL do PDF servido pelo backend
   */
  getPdfUrl(cert: CertificadoPdf): string {
    return this.certificationsService.getCertificadoPdfUrl(cert.fileName);
  }

  /**
   * Retorna a URL do thumbnail (preview) do certificado
   */
  getThumbnailUrl(cert: CertificadoPdf): string {
    return this.certificationsService.getCertificadoThumbnailUrl(cert.fileName);
  }

  /**
   * Download do certificado (via backend)
   */
  downloadCertificado(cert: CertificadoPdf): void {
    const link = document.createElement('a');
    link.href = this.certificationsService.getCertificadoPdfUrl(cert.fileName);
    link.download = cert.fileName;
    link.target = '_blank';
    link.click();
  }

  /**
   * Abre o certificado no GitHub
   */
  openInGitHub(cert: CertificadoPdf): void {
    window.open(cert.htmlUrl, '_blank');
  }

  /**
   * Formata o tamanho do arquivo
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Força recarregamento dos certificados
   */
  refresh(): void {
    this.certificationsService.refresh().subscribe();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTROLES DO MODAL
  // ─────────────────────────────────────────────────────────────────────────────

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

  /**
   * Reseta a rotação do PDF
   */
  resetRotation(): void {
    this.pdfRotation = 0;
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

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTROLE DE SCROLL
  // ─────────────────────────────────────────────────────────────────────────────

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
}
