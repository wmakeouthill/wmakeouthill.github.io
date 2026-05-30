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
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly isLoading = input<boolean>(false);
  readonly inputText = input<string>('');
  readonly canSend = input<boolean>(false);
  readonly shouldFocus = input<boolean>(false);
  readonly selectedModel = input<AIModel>('gemini');
  readonly attachments = input<File[]>([]);

  readonly onInputChange = output<string>();
  readonly onSend = output<void>();
  readonly onCancel = output<void>();
  readonly onNewConversation = output<void>();
  readonly onModelChange = output<AIModel>();
  readonly onAttach = output<File[]>();
  readonly onRemoveAttachment = output<number>();

  isDropdownOpen = signal(false);
  isRecording = signal(false);

  private mediaRecorder?: MediaRecorder;
  private recordedChunks: Blob[] = [];

  readonly models: { id: AIModel; name: string }[] = [
    { id: 'gemini', name: 'Gemini Flash' },
    { id: 'gpt', name: 'GPT-5' }
  ];

  readonly acceptTypes = 'image/*,application/pdf,.txt,.md,.doc,.docx,audio/*,video/*';

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

  // ====================== Anexos ======================

  openFilePicker(): void {
    this.fileInput?.nativeElement?.click();
  }

  handleFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length > 0) {
      this.onAttach.emit(files);
    }
    // Permite reanexar o mesmo arquivo limpando o valor
    input.value = '';
  }

  removeAttachment(index: number): void {
    this.onRemoveAttachment.emit(index);
  }

  // ====================== Gravação de áudio ======================

  async toggleRecording(): Promise<void> {
    if (this.isRecording()) {
      this.stopRecording();
      return;
    }
    await this.startRecording();
  }

  private async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordedChunks = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 0) {
          const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: 'audio/webm' });
          this.onAttach.emit([file]);
        }
        this.isRecording.set(false);
      };
      this.mediaRecorder = recorder;
      recorder.start();
      this.isRecording.set(true);
    } catch (error) {
      console.warn('Não foi possível acessar o microfone:', error);
      this.isRecording.set(false);
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
}
