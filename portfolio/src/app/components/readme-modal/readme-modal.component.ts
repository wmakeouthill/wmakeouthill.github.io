import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy, AfterViewInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
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
export class ReadmeModalComponent implements OnChanges, AfterViewInit {
  @Input() isOpen = false;
  @Input() projectName = '';
  @Input() visible = true;
  @Output() close = new EventEmitter<void>();

  @ViewChild('markdownContent', { static: false }) markdownContent!: ElementRef;

  readmeContent: SafeHtml = '';
  loadingReadme = false;
  markdownZoom = 1.0;
  rawMarkdown = '';

  constructor(
    private readonly markdownService: MarkdownService,
    private readonly sanitizer: DomSanitizer
  ) { }

  ngOnChanges(changes: any) {
    if (changes['isOpen'] && this.isOpen) {
      this.loadFromCache();
    }
  }

  ngAfterViewInit() {
      if (this.isOpen) {
      this.setupCodeBlocks();
    }
  }

  private loadFromCache() {
    if (!this.projectName || this.loadingReadme) return;
    this.loadingReadme = true;
    const cached = this.markdownService.getReadmeContentSync(this.projectName);
    this.readmeContent = cached ? this.sanitizer.bypassSecurityTrustHtml(cached) : '';
    this.loadingReadme = false;
    
    // Carregar markdown raw para download
    this.loadRawMarkdown();
    
    // Setup code blocks após carregar
    setTimeout(() => this.setupCodeBlocks(), 100);
  }

  private async loadRawMarkdown() {
    try {
      const projectFile = this.markdownService.mapProjectToFile(this.projectName);
      const response = await fetch(`/assets/portfolio_md/${projectFile}`);
      this.rawMarkdown = await response.text();
    } catch (error) {
      console.error('Erro ao carregar markdown raw:', error);
    }
  }

  private setupCodeBlocks() {
    if (!this.markdownContent?.nativeElement) return;
    
    // Aplicar syntax highlighting com PrismJS
    if (typeof (window as any).Prism !== 'undefined') {
      const codeBlocks = this.markdownContent.nativeElement.querySelectorAll('pre code');
      codeBlocks.forEach((codeBlock: HTMLElement) => {
        (window as any).Prism.highlightElement(codeBlock);
      });
    }
    
    // Configurar botões de copiar
    const copyButtons = this.markdownContent.nativeElement.querySelectorAll('.copy-btn');
    copyButtons.forEach((btn: HTMLButtonElement) => {
      (btn as any).copyCode = () => {
        const codeElement = btn.closest('pre')?.querySelector('code');
        const codeText = codeElement?.textContent || '';
        navigator.clipboard.writeText(codeText).then(() => {
          const originalText = btn.querySelector('span')!.textContent;
          btn.querySelector('span')!.textContent = 'Copiado!';
          btn.style.background = 'rgba(34, 197, 94, 0.2)';
          btn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
          btn.style.color = '#22c55e';
          
          setTimeout(() => {
            btn.querySelector('span')!.textContent = originalText;
            btn.style.background = '#f7fafc';
            btn.style.borderColor = '#e2e8f0';
            btn.style.color = '#2d3748';
          }, 2000);
        });
      };
    });
  }

  increaseZoom() {
    if (this.markdownZoom < 1.5) {
      this.markdownZoom += 0.1;
      this.applyZoom();
    }
  }

  decreaseZoom() {
    if (this.markdownZoom > 0.7) {
      this.markdownZoom -= 0.1;
      this.applyZoom();
    }
  }

  resetZoom() {
    this.markdownZoom = 1.0;
    this.applyZoom();
  }

  private applyZoom() {
    if (this.markdownContent?.nativeElement) {
      this.markdownContent.nativeElement.style.fontSize = `${this.markdownZoom}em`;
    }
  }

  downloadMarkdown() {
    if (!this.rawMarkdown) return;
    
    const blob = new Blob([this.rawMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.projectName}-README.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  onMouseWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0 && this.markdownZoom < 1.5) {
        this.increaseZoom();
      } else if (event.deltaY > 0 && this.markdownZoom > 0.7) {
        this.decreaseZoom();
      }
    }
  }

  closeModal() {
    this.close.emit();
  }
}


