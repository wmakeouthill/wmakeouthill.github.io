import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';

@Component({
  selector: 'app-cv-modal',
  standalone: true,
  imports: [CommonModule, PdfViewerComponent],
  templateUrl: './cv-modal.component.html',
  styleUrl: './cv-modal.component.css'
})
export class CvModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  // pdfZoom = 1.0 significa 100%.
  pdfZoom = 1.0; // Zoom padrão (1.0 = 100%)
  cvPath = '/assets/curriculo/Wesley de Carvalho Augusto Correia - Currículo.pdf';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.disableBodyScroll();
      } else {
        this.enableBodyScroll();
      }
    }
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

    // Restaura a posição do scroll
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY));
    }
  }

  increaseZoom() {
    if (this.pdfZoom < 1.3) {
      this.pdfZoom += 0.1;
    }
  }

  decreaseZoom() {
    if (this.pdfZoom > 0.7) {
      this.pdfZoom -= 0.1;
    }
  }

  resetZoom() {
    this.pdfZoom = 1.0;
  }

  closeModal() {
    this.enableBodyScroll();
    this.close.emit();
  }

  downloadCV() {
    const link = document.createElement('a');
    link.href = this.cvPath;
    link.download = 'Wesley de Carvalho Augusto Correia - Currículo.pdf';
    link.target = '_blank';
    link.click();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  onMouseWheel(event: WheelEvent) {
    // Apenas zoom com Ctrl+scroll, sem interferir no scroll do PDF
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0 && this.pdfZoom < 1.3) {
        this.increaseZoom();
      } else if (event.deltaY > 0 && this.pdfZoom > 0.7) {
        this.decreaseZoom();
      }
    }
    // Deixa o scroll normal passar para o iframe do PDF
  }

  ngOnDestroy() {
    // Garantir que o scroll seja reativado caso o componente seja destruído
    this.enableBodyScroll();
  }

  // O PdfViewerComponent gerencia carregamento e renderização sem necessidade de rebuild do URL.
}
