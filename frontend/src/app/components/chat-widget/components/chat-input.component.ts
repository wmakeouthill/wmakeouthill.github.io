import { ChangeDetectionStrategy, Component, ElementRef, Injector, ViewChild, afterNextRender, effect, inject, input, output, runInInjectionContext, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/i18n.pipe';

export type AIModel = 'gemini' | 'gpt';

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

  @ViewChild('chatInput') chatInput?: ElementRef<HTMLTextAreaElement>;

  readonly isLoading = input<boolean>(false);
  readonly inputText = input<string>('');
  readonly canSend = input<boolean>(false);
  readonly shouldFocus = input<boolean>(false);
  readonly selectedModel = input<AIModel>('gemini');

  readonly onInputChange = output<string>();
  readonly onSend = output<void>();
  readonly onNewConversation = output<void>();
  readonly onModelChange = output<AIModel>();

  isDropdownOpen = signal(false);

  readonly models: { id: AIModel; name: string }[] = [
    { id: 'gemini', name: 'Gemini Flash' },
    { id: 'gpt', name: 'GPT-5' }
  ];

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

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSubmit();
    }
    // Shift+Enter permite pular linha normalmente (comportamento padrão do textarea)
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

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
  }

  selectModel(model: AIModel): void {
    this.onModelChange.emit(model);
    this.isDropdownOpen.set(false);
  }

  getModelName(): string {
    return this.models.find(m => m.id === this.selectedModel())?.name || 'Gemini 1.5 Flash';
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }
}
