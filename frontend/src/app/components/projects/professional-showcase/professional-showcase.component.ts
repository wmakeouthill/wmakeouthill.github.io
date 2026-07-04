import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';

import { I18nService } from '../../../i18n/i18n.service';
import { TranslatePipe } from '../../../i18n/i18n.pipe';
import { CaseItem } from '../../../models/interfaces';

/**
 * Vitrine auto-rotativa de cases: faixa de logos clicaveis + card grande.
 * Rotacao 3,5 s; pausa 15 s apos interacao; pausa fora do viewport; SSR-safe.
 */
@Component({
  selector: 'app-professional-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './professional-showcase.component.html',
  styleUrl: './professional-showcase.component.css'
})
export class ProfessionalShowcaseComponent implements OnDestroy {
  private static readonly AUTO_ROTATE_MS = 3500;
  private static readonly PAUSE_AFTER_CLICK_MS = 15000;
  private static readonly DRAG_THRESHOLD_PX = 4;

  private readonly i18n = inject(I18nService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly logosStrip = viewChild<ElementRef<HTMLElement>>('logosStrip');

  readonly cases = input.required<CaseItem[]>();
  readonly readCase = output<string>();

  readonly activeIndex = signal<number>(0);
  readonly activeCase = computed(() => this.cases()[this.activeIndex()] ?? null);
  readonly isDragging = signal(false);

  readonly isLogoCover = computed(() => {
    const item = this.activeCase();
    if (!item?.coverUrl) {
      return false;
    }
    return item.coverUrl === item.logoUrl || item.coverUrl.toLowerCase().includes('.svg');
  });

  private rotateTimer: ReturnType<typeof setInterval> | null = null;
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private visibilityObserver?: IntersectionObserver;
  private inViewport = true;
  private pausedByClick = false;
  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private scrollStartX = 0;
  private dragged = false;

  private readonly setupOnCases = effect(() => {
    const total = this.cases().length;
    if (total === 0) {
      this.stopRotation();
      return;
    }
    if (this.activeIndex() >= total) {
      this.activeIndex.set(0);
    }
    if (this.isBrowser() && total > 1) {
      this.observeViewport();
      this.startRotation();
    }
  });

  private readonly scrollActiveOnChange = effect(() => {
    this.activeIndex();
    this.scrollActiveTabIntoView();
  });

  ngOnDestroy(): void {
    this.stopRotation();
    this.visibilityObserver?.disconnect();
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }
  }

  select(index: number): void {
    if (index < 0 || index >= this.cases().length) {
      return;
    }
    this.activeIndex.set(index);
    this.pauseAfterInteraction();
  }

  private advance(): void {
    const total = this.cases().length;
    if (total <= 1) {
      return;
    }
    this.activeIndex.set((this.activeIndex() + 1) % total);
  }

  onLogoActivate(index: number, event: MouseEvent): void {
    if (this.dragged) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.select(index);
  }

  goPrevious(): void {
    const total = this.cases().length;
    if (total <= 1) {
      return;
    }
    this.select((this.activeIndex() - 1 + total) % total);
  }

  goNext(): void {
    const total = this.cases().length;
    if (total <= 1) {
      return;
    }
    this.select((this.activeIndex() + 1) % total);
  }

  onStripPointerDown(event: PointerEvent): void {
    if (!this.isBrowser() || event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('.showcase-logo')) {
      return;
    }
    const strip = this.logosStrip()?.nativeElement;
    if (!strip || strip.scrollWidth <= strip.clientWidth) {
      return;
    }
    strip.setPointerCapture(event.pointerId);
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.scrollStartX = strip.scrollLeft;
    this.dragged = false;
    this.isDragging.set(true);
  }

  onStripPointerMove(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) {
      return;
    }
    const strip = this.logosStrip()?.nativeElement;
    if (!strip) {
      return;
    }
    const deltaX = event.clientX - this.dragStartX;
    if (Math.abs(deltaX) > ProfessionalShowcaseComponent.DRAG_THRESHOLD_PX) {
      this.dragged = true;
    }
    strip.scrollLeft = this.scrollStartX - deltaX;
  }

  onStripPointerUp(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) {
      return;
    }
    const strip = this.logosStrip()?.nativeElement;
    strip?.releasePointerCapture(event.pointerId);
    this.dragPointerId = null;
    this.isDragging.set(false);
    globalThis.setTimeout(() => {
      this.dragged = false;
    }, 0);
  }

  caseHref(slug: string): string {
    return this.i18n.language() === 'en' ? `/en/cases/${slug}` : `/cases/${slug}`;
  }

  onReadCase(event: MouseEvent, slug: string): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      return;
    }
    event.preventDefault();
    this.readCase.emit(slug);
  }

  private scrollActiveTabIntoView(): void {
    if (!this.isBrowser()) {
      return;
    }
    const strip = this.logosStrip()?.nativeElement;
    if (!strip) {
      return;
    }
    const active = strip.querySelector<HTMLElement>('.showcase-logo.active');
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  private startRotation(): void {
    if (!this.canRotate() || this.rotateTimer) {
      return;
    }
    this.rotateTimer = setInterval(() => this.advance(), ProfessionalShowcaseComponent.AUTO_ROTATE_MS);
  }

  private stopRotation(): void {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  private pauseAfterInteraction(): void {
    if (!this.isBrowser()) {
      return;
    }
    this.pausedByClick = true;
    this.stopRotation();
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }
    this.pauseTimeout = setTimeout(() => {
      this.pausedByClick = false;
      this.startRotation();
    }, ProfessionalShowcaseComponent.PAUSE_AFTER_CLICK_MS);
  }

  private observeViewport(): void {
    if (this.visibilityObserver || typeof IntersectionObserver === 'undefined') {
      return;
    }
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.inViewport = entries.some(entry => entry.isIntersecting);
      if (this.inViewport) {
        this.startRotation();
      } else {
        this.stopRotation();
      }
    }, { threshold: 0.2 });
    this.visibilityObserver.observe(this.host.nativeElement);
  }

  private canRotate(): boolean {
    return this.isBrowser()
      && this.cases().length > 1
      && this.inViewport
      && !this.pausedByClick
      && !this.prefersReducedMotion();
  }

  private prefersReducedMotion(): boolean {
    return this.isBrowser()
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}
