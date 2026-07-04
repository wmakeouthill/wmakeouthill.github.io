import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, inject, OnInit, signal, effect, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';
import { CertificationsService } from '../../services/certifications.service';
import { I18nService } from '../../i18n/i18n.service';
import { CertificadoPdf } from '../../services/certifications.service';
import { ScrollLockService } from '../../services/scroll-lock.service';

@Component({
  selector: 'app-cv-modal',
  standalone: true,
  imports: [CommonModule, PdfViewerComponent],
  templateUrl: './cv-modal.component.html',
  styleUrl: './cv-modal.component.css'
})
export class CvModalComponent implements OnInit, OnChanges, OnDestroy {
  private readonly certificationsService = inject(CertificationsService);
  private readonly i18n = inject(I18nService);
  private readonly scrollLock = inject(ScrollLockService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private scrollLocked = false;

  /**
   * Usa o renderizador de PDF nativo do navegador (PDFium via <iframe>) quando há
   * suporte inline (`navigator.pdfViewerEnabled`), evitando baixar o pdf.js. O
   * pdf.js continua como fallback lazy (mobile/sem viewer nativo).
   */
  readonly useNativePdf = this.isBrowser
    && typeof navigator !== 'undefined'
    && navigator.pdfViewerEnabled === true;
  /** Idioma dos metadados já carregados (cache: evita refetch a cada abertura). */
  private loadedLang: string | null = null;
  // Recarrega os metadados se o idioma mudar com o modal aberto. Fora isso, o
  // carregamento é lazy (só na abertura, via ngOnChanges) e nunca roda no SSR:
  // este componente é instanciado na home mesmo fechado, e o fetch no init
  // disparava uma chamada ao backend em todo render server-side.
  private readonly languageEffect = effect(() => {
    const lang = this.i18n.language();
    if (!this.isBrowser || !this.isOpen || lang === this.loadedLang) {
      return;
    }
    this.loadCurriculoMetadata(lang);
  });

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

  /** Metadados do currículo (varia com idioma) */
  readonly curriculo = signal<CertificadoPdf | null>(null);

  /** URL reativa do PDF (inclui lang e hash para evitar cache cruzado) */
  readonly pdfUrl = computed(() => {
    const lang = this.i18n.getLanguageForBackend?.() ?? 'pt';
    const version = this.curriculo()?.sha ?? Date.now();
    return `${this.certificationsService.getCurriculoPdfUrl()}?lang=${lang}&v=${version}`;
  });

  /** URL confiável do PDF para o <iframe> nativo (somente quando `useNativePdf`). */
  readonly nativePdfUrl = computed<SafeResourceUrl | null>(() => {
    if (!this.useNativePdf) {
      return null;
    }
    const url = `${this.pdfUrl()}#toolbar=1&navpanes=0&view=FitH`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  /** Loading state */
  readonly loading = signal(false);

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.disableBodyScroll();
        this.ensureCurriculoLoaded();
      } else {
        this.enableBodyScroll();
      }
    }
  }

  /**
   * Retorna a URL do PDF do currículo (servido pelo backend)
   */
  getCurriculoPdfUrl(): string {
    return this.pdfUrl();
  }

  private curriculoFileName(): string {
    return this.curriculo()?.fileName || 'Wesley de Carvalho Augusto Correia - Currículo.pdf';
  }

  /** Carrega os metadados na abertura do modal, se ainda não tiver para o idioma atual. */
  private ensureCurriculoLoaded(): void {
    if (!this.isBrowser) {
      return;
    }
    const lang = this.i18n.language();
    if (lang !== this.loadedLang) {
      this.loadCurriculoMetadata(lang);
    }
  }

  /**
   * Carrega os metadados do currículo para obter a URL do GitHub
   */
  private loadCurriculoMetadata(lang: string): void {
    this.loading.set(true);
    // Marca antes do fetch para não disparar requisições duplicadas
    // (abertura + effect de idioma); em erro, volta a null para retentar.
    this.loadedLang = lang;

    this.certificationsService.loadCurriculo().subscribe({
      next: (curriculo) => {
        if (curriculo) {
          this.curriculo.set(curriculo);
          console.log('✅ Metadados do currículo carregados');
        } else {
          this.loadedLang = null;
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar metadados do currículo:', err);
        this.loadedLang = null;
        this.loading.set(false);
      }
    });
  }

  private disableBodyScroll(): void {
    if (this.scrollLocked) return;
    this.scrollLocked = true;
    this.scrollLock.lock();
  }

  private enableBodyScroll(): void {
    if (!this.scrollLocked) return;
    this.scrollLocked = false;
    this.scrollLock.unlock();
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
    link.download = this.curriculoFileName();
    link.target = '_blank';
    link.click();
  }

  openInGitHub(): void {
    const url = this.curriculo()?.htmlUrl;
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
