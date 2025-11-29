import { Component, input, output, ViewChild, ElementRef, effect, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.css']
})
export class ChatInputComponent {
  @ViewChild('chatInput') chatInput?: ElementRef<HTMLInputElement>;

  readonly isLoading = input<boolean>(false);
  readonly inputText = input<string>('');
  readonly canSend = input<boolean>(false);
  readonly shouldFocus = input<boolean>(false);

  readonly onInputChange = output<string>();
  readonly onSend = output<void>();

  constructor() {
    afterNextRender(() => {
      effect(() => {
        if (this.shouldFocus() && this.chatInput) {
          queueMicrotask(() => {
            this.chatInput?.nativeElement?.focus();
          });
        }
      });
    });
  }

  handleInputChange(value: string): void {
    this.onInputChange.emit(value);
  }

  handleSubmit(): void {
    if (this.canSend()) {
      this.onSend.emit();
    }
  }
}

