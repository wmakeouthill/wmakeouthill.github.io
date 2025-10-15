import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-cv-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './cv-modal.component.html',
    styleUrl: './cv-modal.component.css'
})
export class CvModalComponent {
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();

    pdfZoom = 1.0; // Zoom padrão
    cvPath = '/assets/curriculo/Wesley de Carvalho Augusto Correia - Currículo.pdf';

    increaseZoom() {
        if (this.pdfZoom < 2.0) {
            this.pdfZoom += 0.1;
        }
    }

    decreaseZoom() {
        if (this.pdfZoom > 0.5) {
            this.pdfZoom -= 0.1;
        }
    }

    resetZoom() {
        this.pdfZoom = 1.0;
    }

    closeModal() {
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
        if (event.ctrlKey) {
            event.preventDefault();
            if (event.deltaY < 0) {
                this.increaseZoom();
            } else {
                this.decreaseZoom();
            }
        }
    }
}
