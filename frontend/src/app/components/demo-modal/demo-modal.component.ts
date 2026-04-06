import {
  Component,
  inject,
  input,
  output,
  signal,
  effect,
  OnDestroy,
  ChangeDetectionStrategy
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
  readonly lightboxItem = signal<GalleryMedia | null>(null);

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (open) {
        this.view.set('choice');
        this.galleryItems.set([]);
        this.lightboxItem.set(null);
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
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  openGallery(): void {
    this.view.set('gallery');
    this.loadGallery();
  }

  backToChoice(): void {
    this.view.set('choice');
    this.lightboxItem.set(null);
  }

  openLightbox(item: GalleryMedia): void {
    if (!item.isVideo) {
      this.lightboxItem.set(item);
    }
  }

  closeLightbox(): void {
    this.lightboxItem.set(null);
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
    if ((event.target as HTMLElement).classList.contains('lightbox-overlay')) {
      this.closeLightbox();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.lightboxItem()) {
        this.closeLightbox();
      } else {
        this.closeModal();
      }
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
