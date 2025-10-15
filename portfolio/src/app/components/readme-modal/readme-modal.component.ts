import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Component({
    selector: 'app-readme-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './readme-modal.component.html',
    styleUrls: ['./readme-modal.component.css']
})
export class ReadmeModalComponent implements OnInit, OnDestroy {
    @Input() isOpen = false;
    @Input() projectName = '';
    @Output() close = new EventEmitter<void>();

    readmeContent: string = '';
    loadingReadme = false;
    markdownZoom = 0.9;

    constructor(
        private markdownService: MarkdownService,
        public sanitizer: DomSanitizer,
        private elementRef: ElementRef,
        private renderer: Renderer2
    ) { }

    ngOnInit() {
        // Não carregar aqui, apenas no ngOnChanges
    }

    ngOnDestroy() {
        // Limpeza se necessário
    }

    ngOnChanges(changes: any) {
        if (changes['isOpen'] && this.isOpen && this.projectName) {
            this.loadReadme();
        }
    }

    private loadReadme() {
        this.loadingReadme = true;
        this.readmeContent = '';

        this.markdownService.getReadmeContent(this.projectName).subscribe({
            next: (content) => {
                this.readmeContent = content;
                this.loadingReadme = false;

                // Renderizar diagramas Mermaid após o conteúdo ser inserido no DOM
                setTimeout(() => {
                    this.markdownService.renderMermaidDiagrams();
                }, 100);
            },
            error: (error) => {
                console.error('Erro ao carregar README:', error);
                this.loadingReadme = false;
            }
        });
    }

    closeModal() {
        this.close.emit();
    }

    increaseZoom() {
        if (this.markdownZoom < 1.5) {
            this.markdownZoom += 0.1;
        }
    }

    decreaseZoom() {
        if (this.markdownZoom > 0.5) {
            this.markdownZoom -= 0.1;
        }
    }

    resetZoom() {
        this.markdownZoom = 0.9;
    }

    onMouseWheel(event: WheelEvent) {
        if (event.ctrlKey) {
            event.preventDefault();
            if (event.deltaY < 0) {
                this.increaseZoom();
            } else {
                this.decreaseZoom();
            }
        }
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.ctrlKey) {
            switch (event.key) {
                case '=':
                case '+':
                    event.preventDefault();
                    this.increaseZoom();
                    break;
                case '-':
                    event.preventDefault();
                    this.decreaseZoom();
                    break;
                case '0':
                    event.preventDefault();
                    this.resetZoom();
                    break;
            }
        }

        if (event.key === 'Escape') {
            this.closeModal();
        }
    }

    onOverlayClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            this.closeModal();
        }
    }
}
