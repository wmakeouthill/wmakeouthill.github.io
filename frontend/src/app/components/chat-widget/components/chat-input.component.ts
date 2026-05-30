import { ChangeDetectionStrategy, Component, ElementRef, Injector, ViewChild, afterNextRender, effect, inject, input, output, runInInjectionContext, signal } from '@angular/core';
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
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly isLoading = input<boolean>(false);
  readonly inputText = input<string>('');
  readonly canSend = input<boolean>(false);
  readonly shouldFocus = input<boolean>(false);
  readonly attachments = input<File[]>([]);

  readonly onInputChange = output<string>();
  readonly onSend = output<void>();
  readonly onCancel = output<void>();
  readonly onAttach = output<File[]>();
  readonly onRemoveAttachment = output<number>();

  isRecording = signal(false);

  private mediaRecorder?: MediaRecorder;
  private recordedChunks: Blob[] = [];

  readonly acceptTypes = 'image/*,application/pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,audio/*';

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
    return;
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
    // Input de linha unica como no prototipo.
  }

  handleSubmit(): void {
    if (this.canSend()) {
      this.onSend.emit();
      setTimeout(() => this.adjustHeight(), 0);
    }
  }

  handleCancel(): void {
    this.onCancel.emit();
  }

  focus(): void {
    if (this.chatInput?.nativeElement) {
      queueMicrotask(() => {
        this.chatInput?.nativeElement?.focus();
      });
    }
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
