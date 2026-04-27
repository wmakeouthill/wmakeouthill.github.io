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
  readonly onCancel = output<void>();
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

        effect(() => {
          this.inputText();
          queueMicrotask(() => this.adjustHeight());
        });
      });
    });
  }

  private adjustHeight(): void {
    const textarea = this.chatInput?.nativeElement;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = parseFloat(getComputedStyle(textarea).maxHeight);
    const scrollH = textarea.scrollHeight;
    if (scrollH >= maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${scrollH}px`;
      textarea.style.overflowY = 'hidden';
    }
  }

  handleInputChange(value: string): void {
    this.onInputChange.emit(value);
    queueMicrotask(() => this.adjustHeight());
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
      // O parent limpa o inputText após emit; aguarda o ngModel propagar ao DOM
      // antes de recalcular a altura, senão o scrollHeight ainda reflete o texto antigo.
      setTimeout(() => this.adjustHeight(), 0);
    }
  }

  handleCancel(): void {
    this.onCancel.emit();
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
    return this.models.find(m => m.id === this.selectedModel())?.name || 'Gemini Flash';
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }
}
