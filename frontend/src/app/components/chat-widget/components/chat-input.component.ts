import { ChangeDetectionStrategy, Component, ElementRef, Injector, ViewChild, afterNextRender, computed, effect, inject, input, output, runInInjectionContext, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/i18n.pipe';

export interface SlashCommand {
  /** Token digitado, ex: '/email'. */
  command: string;
  /** Chave i18n da descrição exibida no menu. */
  descriptionKey: string;
  /** Dica de uso exibida no menu (ex: '/email sua mensagem'). */
  hint?: string;
  /** Quando true, executa uma ação no widget ao selecionar (sem argumentos). */
  immediate?: boolean;
}

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
  readonly attachments = input<File[]>([]);

  readonly onInputChange = output<string>();
  readonly onSend = output<void>();
  readonly onCancel = output<void>();
  readonly onAttach = output<File[]>();
  readonly onRemoveAttachment = output<number>();
  /** Emite o token de um comando imediato (ex: '/new', '/history'). */
  readonly onCommand = output<string>();

  isRecording = signal(false);

  private mediaRecorder?: MediaRecorder;
  private recordedChunks: Blob[] = [];

  readonly acceptTypes = 'image/*,application/pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,audio/*';

  /** Comandos slash disponíveis no chat. */
  readonly slashCommands: SlashCommand[] = [
    { command: '/email', descriptionKey: 'chat.cmdEmail', hint: '/email ...' },
    { command: '/new', descriptionKey: 'chat.cmdNew', immediate: true },
    { command: '/history', descriptionKey: 'chat.cmdHistory', immediate: true }
  ];

  /** Índice destacado no menu (navegação por teclado). */
  readonly highlightedIndex = signal(0);
  /** Permite fechar o menu com Esc mesmo com o texto começando por '/'. */
  private readonly menuDismissed = signal(false);

  /** Comandos que batem com o que está sendo digitado. */
  readonly filteredCommands = computed<SlashCommand[]>(() => {
    const value = this.inputText().trim();
    if (!value.startsWith('/') || value.includes(' ')) {
      return [];
    }
    const query = value.slice(1).toLowerCase();
    return this.slashCommands.filter((c) => c.command.slice(1).toLowerCase().startsWith(query));
  });

  /** Se o menu de comandos deve aparecer. */
  readonly showSlashMenu = computed(() => !this.menuDismissed() && this.filteredCommands().length > 0);

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

        // Reseta o destaque quando a lista filtrada muda.
        effect(() => {
          this.filteredCommands();
          this.highlightedIndex.set(0);
        });
      });
    });
  }

  /** Altura máxima do campo (px) antes de exibir rolagem interna. */
  private static readonly MAX_HEIGHT = 120;

  /** Ajusta a altura do textarea ao conteúdo (auto-grow até MAX_HEIGHT). */
  private adjustHeight(): void {
    const el = this.chatInput?.nativeElement;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ChatInputComponent.MAX_HEIGHT)}px`;
  }

  handleInputChange(value: string): void {
    // Voltar a digitar reabre o menu (cancela o "fechar com Esc").
    this.menuDismissed.set(false);
    this.onInputChange.emit(value);
    queueMicrotask(() => this.adjustHeight());
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.showSlashMenu()) {
      const commands = this.filteredCommands();
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.highlightedIndex.update((i) => (i + 1) % commands.length);
          return;
        case 'ArrowUp':
          event.preventDefault();
          this.highlightedIndex.update((i) => (i - 1 + commands.length) % commands.length);
          return;
        case 'Tab':
        case 'Enter':
          event.preventDefault();
          this.selectCommand(commands[this.highlightedIndex()]);
          return;
        case 'Escape':
          event.preventDefault();
          this.menuDismissed.set(true);
          return;
      }
    }

    // Enter envia; Shift+Enter quebra linha (comportamento padrão do textarea).
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSubmit();
    }
  }

  /** Seleciona um comando do menu (clique ou teclado). */
  selectCommand(cmd?: SlashCommand): void {
    if (!cmd) {
      return;
    }
    if (cmd.immediate) {
      this.onCommand.emit(cmd.command);
      this.onInputChange.emit('');
      this.menuDismissed.set(true);
      this.focus();
      return;
    }
    // Comando com argumentos: preenche e mantém o foco para digitar o conteúdo.
    this.onInputChange.emit(`${cmd.command} `);
    this.focus();
  }

  /** Mousedown no item evita perder o foco do input antes de selecionar. */
  handleCommandMouseDown(cmd: SlashCommand, event: MouseEvent): void {
    event.preventDefault();
    this.selectCommand(cmd);
  }

  /** Insere '/' e foca o input — usado pela dica de descoberta. */
  abrirComandos(): void {
    this.menuDismissed.set(false);
    this.onInputChange.emit('/');
    this.focus();
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
