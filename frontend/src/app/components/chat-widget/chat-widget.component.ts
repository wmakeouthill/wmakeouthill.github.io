import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ChatService, ChatResponse, AIModel } from '../../services/chat.service';
import { MarkdownChatService } from '../../services/markdown-chat.service';
import { ChatFloatingButtonComponent } from './components/chat-floating-button.component';
import { ChatHeaderComponent } from './components/chat-header.component';
import { ChatMessageComponent, ChatMessage, AttachmentMeta, classificarAnexo } from './components/chat-message.component';
import { ChatInputComponent } from './components/chat-input.component';
import { ChatLoadingComponent } from './components/chat-loading.component';
import { useChatScroll, scrollToBottom } from './composables/use-chat-scroll';
import { useOutsideClick } from './composables/use-outside-click';
import { usePageScrollBlock } from './composables/use-page-scroll-block';
import { useSyntaxHighlighting } from './composables/use-syntax-highlighting';
import { useChatMessages } from './composables/use-chat-messages';
import {
  obterOuGerarSessionId,
  salvarMensagens,
  carregarMensagens,
  limparChat
} from '../../utils/chat-storage.util';
import { I18nService } from '../../i18n/i18n.service';

interface ChatMessageRaw {
  from: 'user' | 'assistant';
  text: string;
  timestamp: string | Date;
  attachments?: AttachmentMeta[];
}

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [
    CommonModule,
    ChatFloatingButtonComponent,
    ChatHeaderComponent,
    ChatMessageComponent,
    ChatInputComponent,
    ChatLoadingComponent
  ],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly markdownChatService = inject(MarkdownChatService);
  private readonly i18n = inject(I18nService);

  @ViewChild('messagesContainer') private readonly messagesContainer?: ElementRef<HTMLDivElement>;

  readonly scrollToTopVisible = input<boolean>(false);

  isOpen = signal(false);
  isLoading = signal(false);
  inputText = signal('');
  messages = signal<ChatMessage[]>([]);
  unreadCount = signal(0);
  selectedModel = signal<AIModel>('gemini');
  pendingAttachments = signal<File[]>([]);
  audioResponseEnabled = signal(this.carregarPreferenciaAudio());
  private lastProcessedLength = 0;
  private unreadInitialized = false;
  private sessionId = obterOuGerarSessionId();
  private currentRequest?: Subscription;

  readonly initialMessage = computed<ChatMessage>(() => ({
    from: 'assistant',
    text: this.i18n.translate('chat.initialMessage'),
    timestamp: new Date()
  }));

  readonly canSend = computed(
    () => (this.inputText().trim().length > 0 || this.pendingAttachments().length > 0) && !this.isLoading()
  );

  private readonly outsideClickDestroy = useOutsideClick(this.hostElement, this.isOpen);
  private readonly scrollBlockDestroy = usePageScrollBlock(this.isOpen);
  private readonly chatMessagesHandlers = useChatMessages(
    this.messages,
    this.isLoading,
    this.markdownChatService,
    this.sanitizer,
    () => {
      this.applySyntaxHighlighting();
      // Garante scroll após syntax highlighting
      setTimeout(() => {
        scrollToBottom(this.messagesContainer);
      }, 150);
    }
  );

  @ViewChild(ChatInputComponent) private readonly chatInputComponent?: ChatInputComponent;

  constructor() {
    useChatScroll(this.messagesContainer, this.messages, this.isOpen);
    this.configureChatOpenEffects();
    this.configureLoadingEffects();
    this.configureLanguageEffect();
    this.configureUnreadTracking();
    this.configurarPersistenciaMensagens();

    // Toggle body class for global styling (hiding scroll-to-top)
    effect(() => {
      if (this.isOpen()) {
        document.body.classList.add('chat-open');
      } else {
        document.body.classList.remove('chat-open');
      }
    });
  }

  ngOnInit(): void {
    this.carregarMensagensSalvas();
  }

  ngOnDestroy(): void {
    this.currentRequest?.unsubscribe();
    this.outsideClickDestroy.ngOnDestroy?.();
    this.scrollBlockDestroy.ngOnDestroy?.();
    document.body.classList.remove('chat-open');
  }

  toggleOpen(): void {
    this.isOpen.update((v) => !v);
    // Garante scroll para o final quando abrir (instantâneo)
    if (this.isOpen()) {
      setTimeout(() => {
        scrollToBottom(this.messagesContainer, true); // instant = true ao abrir
        this.focarInput();
        if (this.messages().length === 0) {
          this.messages.set([this.initialMessage()]);
        }
        this.marcarComoLidas();
      }, 150);
    }
    if (!this.isOpen()) {
      // Ao fechar, congela o estado atual para contagem de novas mensagens
      this.lastProcessedLength = this.messages().length;
    }
  }

  handleInputChange(value: string): void {
    this.inputText.set(value);
  }

  handleAttach(files: File[]): void {
    if (!files || files.length === 0) {
      return;
    }
    this.pendingAttachments.update((arr) => [...arr, ...files]);
  }

  handleRemoveAttachment(index: number): void {
    this.pendingAttachments.update((arr) => arr.filter((_, i) => i !== index));
  }

  sendMessage(): void {
    const text = this.inputText().trim();
    const files = this.pendingAttachments();
    if (!this.canSendMessage(text, files)) {
      return;
    }

    const attachmentMetas = files.map((f) => this.toAttachmentMeta(f));
    this.chatMessagesHandlers.addUserMessage(text, attachmentMetas);
    this.inputText.set('');
    this.pendingAttachments.set([]);
    this.isLoading.set(true);

    // Scroll após mensagem do usuário
    setTimeout(() => {
      scrollToBottom(this.messagesContainer);
    }, 50);

    // Mantém foco no input após enviar
    this.focarInput();

    if (this.isEmailCommand(text) && files.length === 0) {
      this.enviarEmailPeloChat(text);
      return;
    }

    const request$ = files.length > 0 || this.audioResponseEnabled()
      ? this.chatService.enviarMultimodal(text, files, this.sessionId, this.selectedModel(), this.audioResponseEnabled())
      : this.chatService.enviarMensagem(text, this.sessionId, this.selectedModel());

    this.currentRequest = request$.subscribe({
      next: (response: ChatResponse) => {
        this.currentRequest = undefined;
        this.chatMessagesHandlers.handleAssistantResponse(response).catch(() => {
          this.chatMessagesHandlers.handleAssistantError();
        });
        // Mantém foco após resposta
        setTimeout(() => {
          this.focarInput();
        }, 100);
      },
      error: () => {
        this.currentRequest = undefined;
        this.chatMessagesHandlers.handleAssistantError();
        // Mantém foco mesmo em caso de erro
        setTimeout(() => {
          this.focarInput();
        }, 100);
      }
    });
  }

  private toAttachmentMeta(file: File): AttachmentMeta {
    const kind = classificarAnexo(file.type, file.name);
    const meta: AttachmentMeta = { name: file.name, mime: file.type, kind };
    if (kind === 'image') {
      meta.previewUrl = URL.createObjectURL(file);
    }
    return meta;
  }

  private enviarEmailPeloChat(text: string): void {
    this.currentRequest = this.chatService.enviarEmailChat(text, this.selectedModel()).subscribe({
      next: async (response) => {
        this.currentRequest = undefined;
        const preview = response.success
          ? this.montarRespostaEmailEnviado(response.subject, response.body)
          : response.reply || 'Não foi possível enviar o email agora.';
        await this.chatMessagesHandlers.handleAssistantResponse({ reply: preview });
        setTimeout(() => this.focarInput(), 100);
      },
      error: () => {
        this.currentRequest = undefined;
        this.chatMessagesHandlers.handleAssistantError();
        setTimeout(() => this.focarInput(), 100);
      }
    });
  }

  private isEmailCommand(text: string): boolean {
    return text.trim().toLowerCase().startsWith('/email');
  }

  private montarRespostaEmailEnviado(subject?: string, body?: string): string {
    const linhas = ['Email enviado para o Wesley.'];
    if (subject) {
      linhas.push('', `**Assunto:** ${subject}`);
    }
    if (body) {
      linhas.push('', '**Mensagem enviada:**', body);
    }
    return linhas.join('\n');
  }

  cancelarMensagem(): void {
    if (this.currentRequest) {
      this.currentRequest.unsubscribe();
      this.currentRequest = undefined;
    }
    this.isLoading.set(false);
    this.focarInput();
  }

  private canSendMessage(text: string, files: File[] = []): boolean {
    return (text.length > 0 || files.length > 0) && !this.isLoading();
  }

  private configureChatOpenEffects(): void {
    effect(() => {
      if (this.isOpen()) {
        // Aguarda renderização completa do DOM
        setTimeout(() => {
          this.applySyntaxHighlighting();
          // Scroll instantâneo para o final ao abrir (sem animação)
          scrollToBottom(this.messagesContainer, true);
          // Foca no input para facilitar digitação
          this.focarInput();
        }, 150);
      }
    });
  }

  private focarInput(): void {
    // Usa o método público do componente para focar
    queueMicrotask(() => {
      this.chatInputComponent?.focus();
    });
  }

  private applySyntaxHighlighting(): void {
    useSyntaxHighlighting(this.messagesContainer);
  }

  private configureLoadingEffects(): void {
    // Quando o loading termina, garante scroll para a última mensagem
    effect(() => {
      const loading = this.isLoading();
      if (!loading && this.messages().length > 0) {
        setTimeout(() => {
          scrollToBottom(this.messagesContainer);
        }, 200);
      }
    });
  }

  private configureLanguageEffect(): void {
    effect(() => {
      // Reaplica a mensagem inicial quando só ela existe e o idioma muda
      this.i18n.language();
      const current = this.messages();
      if (current.length === 0) {
        this.messages.set([this.initialMessage()]);
        return;
      }
      if (current.length === 1 && current[0].from === 'assistant') {
        const initial = this.initialMessage();
        // Evita loop infinito: só atualiza se o texto estiver diferente
        if (current[0].text !== initial.text) {
          this.messages.set([
            {
              ...current[0],
              text: initial.text,
              timestamp: new Date()
            }
          ]);
        }
      }
    });
  }

  private async carregarMensagensSalvas(): Promise<void> {
    const mensagensSalvas = carregarMensagens<ChatMessageRaw>();
    if (mensagensSalvas.length > 0) {
      const mensagensConvertidas = await this.converterMensagensSalvas(mensagensSalvas);
      this.messages.set(mensagensConvertidas);
      this.marcarComoLidas();
      // Se o chat já estiver aberto, garante scroll para o final
      if (this.isOpen()) {
        setTimeout(() => {
          scrollToBottom(this.messagesContainer, true);
        }, 100);
      }
    } else {
      this.messages.set([this.initialMessage()]);
      this.marcarComoLidas();
    }
  }

  private async converterMensagensSalvas(mensagensRaw: ChatMessageRaw[]): Promise<ChatMessage[]> {
    const mensagens: ChatMessage[] = [];

    for (const msg of mensagensRaw) {
      const timestamp = typeof msg.timestamp === 'string'
        ? new Date(msg.timestamp)
        : msg.timestamp;

      if (msg.from === 'assistant' && msg.text) {
        // Re-renderiza HTML para mensagens de assistente
        const html = await this.markdownChatService.renderMarkdownToHtml(msg.text);
        mensagens.push({
          from: msg.from,
          text: msg.text,
          html: this.sanitizer.bypassSecurityTrustHtml(html),
          timestamp
        });
      } else {
        // Mensagens de usuário não precisam HTML
        mensagens.push({
          from: msg.from,
          text: msg.text,
          timestamp,
          ...(msg.attachments && msg.attachments.length > 0 ? { attachments: msg.attachments } : {})
        });
      }
    }

    return mensagens;
  }

  private configurarPersistenciaMensagens(): void {
    effect(() => {
      const currentMessages = this.messages();
      if (currentMessages.length > 0) {
        // Remove HTML (não serializável) e dados pesados (previewUrl/audioUrl/data-url)
        const mensagensParaSalvar = currentMessages.map(msg => ({
          from: msg.from,
          text: msg.text,
          timestamp: msg.timestamp.toISOString(),
          ...(msg.attachments && msg.attachments.length > 0
            ? { attachments: msg.attachments.map(a => ({ name: a.name, mime: a.mime, kind: a.kind })) }
            : {})
        }));
        salvarMensagens(mensagensParaSalvar);
      }
    });
  }

  iniciarNovaConversa(): void {
    // Salva o sessionId ANTIGO antes de limpar para limpar o histórico correto no backend
    const sessionIdAntigo = this.sessionId;

    // Limpa mensagens no frontend
    this.messages.set([this.initialMessage()]);
    this.marcarComoLidas();

    // Limpa sessionStorage (remove sessionId e mensagens)
    limparChat();

    // Gera novo sessionId
    this.sessionId = obterOuGerarSessionId();

    // Limpa o histórico ANTIGO no backend antes de começar nova conversa
    if (sessionIdAntigo) {
      this.chatService.limparHistorico(sessionIdAntigo).subscribe({
        error: () => console.warn('Erro ao limpar histórico no backend')
      });
    }
  }

  toggleAudioResponse(): void {
    this.audioResponseEnabled.update((enabled) => {
      const next = !enabled;
      try {
        localStorage.setItem('portfolio-chat-audio-response', String(next));
      } catch {
        // Mantem o estado em memoria quando localStorage nao estiver disponivel.
      }
      return next;
    });
  }

  private configureUnreadTracking(): void {
    effect(() => {
      const msgs = this.messages();
      const chatAberto = this.isOpen();

      // Primeiro ciclo: apenas inicializa baseline para evitar badge na mensagem inicial
      if (!this.unreadInitialized) {
        this.lastProcessedLength = msgs.length;
        this.unreadCount.set(0);
        this.unreadInitialized = true;
        return;
      }

      if (chatAberto) {
        this.marcarComoLidas();
        return;
      }

      const novasMensagens = msgs.slice(this.lastProcessedLength);
      const novasDoAssistente = novasMensagens.filter((m) => m.from === 'assistant').length;
      if (novasDoAssistente > 0) {
        this.unreadCount.update((valorAtual) => valorAtual + novasDoAssistente);
      }
      this.lastProcessedLength = msgs.length;
    });
  }

  private marcarComoLidas(): void {
    this.lastProcessedLength = this.messages().length;
    this.unreadCount.set(0);
  }

  private carregarPreferenciaAudio(): boolean {
    try {
      return localStorage.getItem('portfolio-chat-audio-response') === 'true';
    } catch {
      return false;
    }
  }
}


