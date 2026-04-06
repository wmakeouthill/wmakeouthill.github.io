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
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { resolveApiUrl } from '../../utils/api-url.util';

export interface GalleryMedia {
  fileName: string;
  displayName: string;
  downloadUrl: string;
  sha: string;
  isVideo: boolean;
}

type ModalView = 'choice' | 'gallery';

@Component({
  selector: 'app-demo-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './demo-modal.component.html',
  styleUrl: './demo-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemoModalComponent implements OnDestroy {
  private readonly http = inject(HttpClient);

  readonly isOpen = input<boolean>(false);
  readonly projectName = input<string>('');
  readonly demoUrl = input<string>('');

  readonly close = output<void>();

  readonly view = signal<ModalView>('choice');
  readonly galleryItems = signal<GalleryMedia[]>([]);
  readonly loading = signal<boolean>(false);
  readonly lightboxIndex = signal<number>(-1);

  readonly lightboxItem = computed(() => {
    const idx = this.lightboxIndex();
    const items = this.galleryItems();
    return idx >= 0 && idx < items.length ? items[idx] : null;
  });

  readonly lightboxHasPrev = computed(() => this.lightboxIndex() > 0);
  readonly lightboxHasNext = computed(() =>
    this.lightboxIndex() < this.galleryItems().length - 1
  );

  readonly lightboxCounter = computed(() => {
    const idx = this.lightboxIndex();
    const total = this.galleryItems().length;
    return idx >= 0 ? `${idx + 1} / ${total}` : '';
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (open) {
        this.view.set('choice');
        this.galleryItems.set([]);
        this.lightboxIndex.set(-1);
        this.disableBodyScroll();
      } else {
        this.enableBodyScroll();
      }
    });
  }

  ngOnDestroy(): void {
    this.enableBodyScroll();
  }

  visitSite(): void {
    const url = this.demoUrl();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  openGallery(): void {
    this.view.set('gallery');
    this.loadGallery();
  }

  backToChoice(): void {
    this.view.set('choice');
    this.lightboxIndex.set(-1);
  }

  openLightbox(item: GalleryMedia): void {
    const idx = this.galleryItems().findIndex(i => i.sha === item.sha);
    if (idx >= 0) this.lightboxIndex.set(idx);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(-1);
  }

  prevItem(): void {
    if (this.lightboxHasPrev()) this.lightboxIndex.update(i => i - 1);
  }

  nextItem(): void {
    if (this.lightboxHasNext()) this.lightboxIndex.update(i => i + 1);
  }

  closeModal(): void {
    this.close.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  onLightboxOverlayClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Fecha ao clicar no fundo ou no lightbox-content (área vazia ao redor da mídia)
    if (target.classList.contains('lightbox-overlay') || target.classList.contains('lightbox-content')) {
      this.closeLightbox();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    if (this.lightboxItem()) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); this.prevItem(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); this.nextItem(); }
      else if (event.key === 'Escape') this.closeLightbox();
    } else if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  private loadGallery(): void {
    const project = this.projectName();
    if (!project) return;

    this.loading.set(true);
    const url = resolveApiUrl(`/api/content/gallery/${encodeURIComponent(project.toLowerCase())}`);

    this.http.get<any[]>(url).subscribe({
      next: (files) => {
        const items: GalleryMedia[] = files.map(f => ({
          fileName: f.fileName,
          displayName: f.displayName,
          downloadUrl: f.downloadUrl,
          sha: f.sha,
          isVideo: this.isVideoFile(f.fileName)
        }));
        this.galleryItems.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.galleryItems.set([]);
        this.loading.set(false);
      }
    });
  }

  private isVideoFile(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return ['mp4', 'webm', 'mov', 'avi'].includes(ext);
  }

  private disableBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private enableBodyScroll(): void {
    document.body.style.overflow = '';
  }
}
