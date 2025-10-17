import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  selector: 'app-readme-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './readme-modal.component.html',
  styleUrls: ['./readme-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReadmeModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() projectName = '';
  @Input() visible = true;
  @Output() close = new EventEmitter<void>();

  readmeContent: SafeHtml = '';
  loadingReadme = false;

  constructor(
    private readonly markdownService: MarkdownService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnChanges(changes: any) {
    if (changes['isOpen'] && this.isOpen) {
      this.loadFromCache();
    }
  }

  private loadFromCache() {
    if (!this.projectName || this.loadingReadme) return;
    this.loadingReadme = true;
    const cached = this.markdownService.getReadmeContentSync(this.projectName);
    this.readmeContent = cached ? this.sanitizer.bypassSecurityTrustHtml(cached) : '';
    this.loadingReadme = false;
  }

  closeModal() {
    this.close.emit();
  }
}


