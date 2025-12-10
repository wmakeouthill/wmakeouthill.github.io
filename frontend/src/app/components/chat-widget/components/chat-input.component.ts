import { ChangeDetectionStrategy, Component, ElementRef, Injector, ViewChild, afterNextRender, effect, inject, input, output, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/i18n.pipe';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.css']
})
export class ChatInputComponent {
  private readonly injector = inject(Injector);

  @ViewChild('chatInput') chatInput?: ElementRef<HTMLInputElement>;

  readonly isLoading = input<boolean>(false);
  readonly inputText = input<string>('');
  readonly canSend = input<boolean>(false);
  readonly shouldFocus = input<boolean>(false);

  readonly onInputChange = output<string>();
  readonly onSend = output<void>();
  readonly onNewConversation = output<void>();

  constructor() {
    afterNextRender(() => {
      runInInjectionContext(this.injector, () => {
        effect(() => {
          if (this.shouldFocus() && this.chatInput) {
            queueMicrotask(() => {
              this.chatInput?.nativeElement?.focus();
            });
          }
        });
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

  iniciarNovaConversa(): void {
    this.onNewConversation.emit();
  }

  focus(): void {
    if (this.chatInput?.nativeElement) {
      queueMicrotask(() => {
        this.chatInput?.nativeElement?.focus();
      });
    }
  }
}

