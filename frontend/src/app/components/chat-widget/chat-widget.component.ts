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
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  iniciarNovaConversa as iniciarNovaConversaStorage,
  listarConversas,
  selecionarConversa,
  removerConversa,
  ConversaSalva
} from '../../utils/chat-storage.util';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/i18n.pipe';

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
    ChatLoadingComponent,
    TranslatePipe
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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
  showHistory = signal(false);
  conversations = signal<ConversaSalva[]>([]);
  private lastProcessedLength = 0;
  private unreadInitialized = false;
  private sessionId = obterOuGerarSessionId();
  private currentRequest?: Subscription;

  readonly initialMessage = computed<ChatMessage>(() => ({
    from: 'assistant',
    text: this.initialMessageText(),
    html: this.sanitizer.bypassSecurityTrustHtml(this.initialMessageHtml()),
    timestamp: new Date()
  }));

  readonly suggestions = computed(() => {
    if (this.i18n.language() === 'en') {
      return [
        'Which technologies does he master?',
        'Tell me about his latest experience',
        'Which AI-powered projects has he built?'
      ];
    }

    return [
      'Quais tecnologias ele domina?',
      'Conte sobre a última experiência',
      'Quais projetos AI-powered ele fez?'
    ];
  });

  readonly shouldShowSuggestions = computed(
    () => !this.isLoading() && this.messages().length === 1 && this.messages()[0].from === 'assistant'
  );

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

    // Toggle body class for global styling (hiding scroll-to-top).
    // document.body não existe no SSR — efeito só roda no browser.
    effect(() => {
      if (!this.isBrowser) {
        return;
      }
      if (this.isOpen()) {
        document.body.classList.add('chat-open');
      } else {
        document.body.classList.remove('chat-open');
      }
    });
  }

  ngOnInit(): void {
    this.carregarMensagensSalvas();
    this.atualizarConversas();
  }

  ngOnDestroy(): void {
    this.currentRequest?.unsubscribe();
    this.outsideClickDestroy.ngOnDestroy?.();
    this.scrollBlockDestroy.ngOnDestroy?.();
    if (this.isBrowser) {
      document.body.classList.remove('chat-open');
    }
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

  sendSuggestedMessage(text: string): void {
    this.inputText.set(text);
    queueMicrotask(() => this.sendMessage());
  }

  /** Trata comandos imediatos vindos do menu slash (sem argumentos). */
  handleCommand(command: string): void {
    switch (command) {
      case '/new':
        this.iniciarNovaConversa();
        break;
      case '/history':
        this.toggleHistory();
        break;
    }
  }

  /** Comandos imediatos digitados manualmente não devem ir para a IA. */
  private isImmediateCommand(text: string): boolean {
    const cmd = text.trim().toLowerCase();
    return cmd === '/new' || cmd === '/history';
  }

  sendMessage(): void {
    const text = this.inputText().trim();
    const files = this.pendingAttachments();
    if (!this.canSendMessage(text, files)) {
      return;
    }

    if (this.isImmediateCommand(text) && files.length === 0) {
      this.inputText.set('');
      this.handleCommand(text.toLowerCase());
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

    if (this.isCurriculoCommand(text) && files.length === 0) {
      this.gerarCurriculoPeloComando(text);
      return;
    }

    const request$ = files.length > 0 || this.audioResponseEnabled()
      ? this.chatService.enviarMultimodal(text, files, this.sessionId, this.selectedModel(), this.audioResponseEnabled())
      : this.chatService.enviarMensagem(text, this.sessionId, this.selectedModel());

    this.currentRequest = request$.subscribe({
      next: (response: ChatResponse) => {
        this.currentRequest = undefined;
        this.chatMessagesHandlers.handleAssistantResponse(response, text).catch(() => {
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

  private isCurriculoCommand(text: string): boolean {
    return text.trim().toLowerCase().startsWith('/curriculo');
  }

  /**
   * Fluxo do comando /curriculo <vaga>: mostra na hora uma mensagem de "gerando"
   * e, quando o PDF volta da requisição dedicada, transforma essa mesma mensagem
   * no card de download (sem nunca rodar duas chamadas ao Vertex na mesma requisição).
   */
  private gerarCurriculoPeloComando(text: string): void {
    const vaga = text.replace(/^\/curriculo\s*/i, '').trim();
    const en = this.i18n.language() === 'en';

    if (!vaga) {
      const dica = en
        ? 'Use: /curriculo <paste the job posting here>'
        : 'Use: /curriculo <cole o conteúdo da vaga aqui>';
      this.chatMessagesHandlers.handleAssistantResponse({ reply: dica });
      return;
    }

    const aviso = en
      ? '📄 Generating your tailored résumé for this role… it will show up here shortly.'
      : '📄 Gerando seu currículo personalizado para essa vaga… já aparece aqui.';
    const placeholder = this.adicionarMensagemCurriculoEmAndamento(aviso);
    this.isLoading.set(false);

    this.dispararGeracaoCurriculo(placeholder, vaga, '');
  }

  /** Handler do botão "Gerar currículo PDF" (fluxo de linguagem natural). */
  onGenerateCurriculo(message: ChatMessage): void {
    const pedido = message.curriculoRequest;
    if (!pedido || message.curriculoLoading || message.generatedPdf) {
      return;
    }
    this.atualizarMensagem(message, { curriculoLoading: true, curriculoError: undefined });
    this.dispararGeracaoCurriculo(message, pedido.message, pedido.reply);
  }

  private dispararGeracaoCurriculo(alvo: ChatMessage, vaga: string, reply: string): void {
    const en = this.i18n.language() === 'en';
    this.currentRequest = this.chatService.gerarCurriculo(vaga, reply, this.sessionId).subscribe({
      next: (response: ChatResponse) => {
        this.currentRequest = undefined;
        if (response?.pdfBase64) {
          const url = `data:application/pdf;base64,${response.pdfBase64}`;
          const filename = response.pdfFilename || 'curriculo-wesley-personalizado.pdf';
          const texto = en
            ? '✅ Your tailored résumé is ready — download it below.'
            : '✅ Seu currículo personalizado está pronto — baixe abaixo.';
          this.atualizarMensagem(alvo, {
            text: texto,
            html: this.sanitizer.bypassSecurityTrustHtml(texto),
            curriculoLoading: false,
            curriculoRequest: undefined,
            curriculoError: undefined,
            generatedPdf: { filename, url }
          });
        } else {
          this.marcarErroCurriculo(alvo, response?.reply);
        }
        setTimeout(() => this.focarInput(), 100);
      },
      error: () => {
        this.currentRequest = undefined;
        this.marcarErroCurriculo(alvo);
        setTimeout(() => this.focarInput(), 100);
      }
    });
  }

  private marcarErroCurriculo(alvo: ChatMessage, mensagem?: string): void {
    const en = this.i18n.language() === 'en';
    const erro = mensagem?.trim()
      || (en ? 'Could not generate the résumé now. Try again.' : 'Não foi possível gerar o currículo agora. Tente novamente.');
    this.atualizarMensagem(alvo, { curriculoLoading: false, curriculoError: erro });
  }

  private adicionarMensagemCurriculoEmAndamento(texto: string): ChatMessage {
    const mensagem: ChatMessage = {
      from: 'assistant',
      text: texto,
      html: this.sanitizer.bypassSecurityTrustHtml(texto),
      timestamp: new Date(),
      curriculoLoading: true
    };
    this.messages.update((arr) => [...arr, mensagem]);
    setTimeout(() => scrollToBottom(this.messagesContainer), 50);
    return mensagem;
  }

  /**
   * Aplica um patch a uma mensagem do signal. Casa pela referência do timestamp
   * (preservada entre patches, já que nunca a sobrescrevemos) para continuar
   * encontrando a mensagem certa mesmo depois de updates anteriores a recriarem.
   */
  private atualizarMensagem(alvo: ChatMessage, patch: Partial<ChatMessage>): void {
    this.messages.update((arr) =>
      arr.map((m) => (m === alvo || m.timestamp === alvo.timestamp ? { ...m, ...patch } : m))
    );
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
              html: initial.html,
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
    // Cria uma nova conversa no storage (a anterior fica preservada no histórico).
    const nova = iniciarNovaConversaStorage();
    this.sessionId = nova.sessionId;

    // Reseta o painel para a mensagem inicial.
    this.messages.set([this.initialMessage()]);
    this.marcarComoLidas();
    this.showHistory.set(false);
    this.atualizarConversas();
    this.focarInput();
  }

  toggleHistory(): void {
    this.showHistory.update((v) => !v);
    if (this.showHistory()) {
      this.atualizarConversas();
    }
  }

  async abrirConversa(id: string): Promise<void> {
    const conversa = selecionarConversa(id);
    if (!conversa) {
      return;
    }
    this.sessionId = conversa.sessionId;
    const mensagens = await this.converterMensagensSalvas(conversa.messages as ChatMessageRaw[]);
    this.messages.set(mensagens.length > 0 ? mensagens : [this.initialMessage()]);
    this.marcarComoLidas();
    this.showHistory.set(false);
    this.atualizarConversas();
    setTimeout(() => {
      scrollToBottom(this.messagesContainer, true);
      this.focarInput();
    }, 100);
  }

  removerConversa(id: string, event: Event): void {
    event.stopPropagation();
    const eraAtual = id === this.conversaAtualId();
    removerConversa(id);
    this.atualizarConversas();
    if (eraAtual) {
      // Se removeu a conversa aberta, começa uma nova limpa.
      this.iniciarNovaConversa();
    }
  }

  private atualizarConversas(): void {
    this.conversations.set(listarConversas());
  }

  conversaAtualId(): string | null {
    const atual = this.conversations().find((c) => c.sessionId === this.sessionId);
    return atual?.id ?? null;
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

  private initialMessageText(): string {
    if (this.i18n.language() === 'en') {
      return "Hi! I'm the AI trained with Wesley's portfolio. Ask about technologies, projects, or experience. You can also attach a file or send audio.";
    }

    return 'Olá! Sou a IA treinada com o portfólio do Wesley. Pergunte sobre tecnologias, projetos ou experiências — você também pode anexar um arquivo ou mandar um áudio.';
  }

  private initialMessageHtml(): string {
    if (this.i18n.language() === 'en') {
      return "Hi! I'm the AI trained with Wesley's portfolio. Ask about technologies, projects, or experience. You can also <strong>attach a file</strong> or <strong>send audio</strong>.";
    }

    return 'Olá! Sou a IA treinada com o portfólio do Wesley. Pergunte sobre tecnologias, projetos ou experiências — você também pode <strong>anexar um arquivo</strong> ou <strong>mandar um áudio</strong>.';
  }
}


