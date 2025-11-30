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
import { ChatService, ChatResponse } from '../../services/chat.service';
import { MarkdownChatService } from '../../services/markdown-chat.service';
import { ChatFloatingButtonComponent } from './components/chat-floating-button.component';
import { ChatHeaderComponent } from './components/chat-header.component';
import { ChatMessageComponent, ChatMessage } from './components/chat-message.component';
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
  limparSessionStorage
} from '../../utils/session-storage.util';

interface ChatMessageRaw {
  from: 'user' | 'assistant';
  text: string;
  timestamp: string | Date;
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

  @ViewChild('messagesContainer') private readonly messagesContainer?: ElementRef<HTMLDivElement>;

  readonly scrollToTopVisible = input<boolean>(false);

  isOpen = signal(false);
  isLoading = signal(false);
  inputText = signal('');
  messages = signal<ChatMessage[]>([]);
  private sessionId = obterOuGerarSessionId();

  readonly initialMessage: ChatMessage = {
    from: 'assistant',
    text: 'Olá! Eu sou a IA treinada com o portfólio do Wesley. Pode perguntar sobre tecnologias que ele domina, projetos que já fez ou experiências profissionais.',
    timestamp: new Date()
  };

  readonly canSend = computed(
    () => this.inputText().trim().length > 0 && !this.isLoading()
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
    this.configurarPersistenciaMensagens();
  }

  ngOnInit(): void {
    this.carregarMensagensSalvas();
  }

  ngOnDestroy(): void {
    this.outsideClickDestroy.ngOnDestroy?.();
    this.scrollBlockDestroy.ngOnDestroy?.();
  }

  toggleOpen(): void {
    this.isOpen.update((v) => !v);
    // Garante scroll para o final quando abrir (instantâneo)
    if (this.isOpen()) {
      setTimeout(() => {
        scrollToBottom(this.messagesContainer, true); // instant = true ao abrir
        this.focarInput();
      }, 150);
    }
  }

  handleInputChange(value: string): void {
    this.inputText.set(value);
  }

  sendMessage(): void {
    const text = this.inputText().trim();
    if (!this.canSendMessage(text)) {
      return;
    }

    this.chatMessagesHandlers.addUserMessage(text);
    this.inputText.set('');
    this.isLoading.set(true);

    // Scroll após mensagem do usuário
    setTimeout(() => {
      scrollToBottom(this.messagesContainer);
    }, 50);

    // Mantém foco no input após enviar
    this.focarInput();

    this.chatService.enviarMensagem(text, this.sessionId).subscribe({
      next: (response: ChatResponse) => {
        this.chatMessagesHandlers.handleAssistantResponse(response).catch(() => {
          this.chatMessagesHandlers.handleAssistantError();
        });
        // Mantém foco após resposta
        setTimeout(() => {
          this.focarInput();
        }, 100);
      },
      error: () => {
        this.chatMessagesHandlers.handleAssistantError();
        // Mantém foco mesmo em caso de erro
        setTimeout(() => {
          this.focarInput();
        }, 100);
      }
    });
  }

  private canSendMessage(text: string): boolean {
    return text.length > 0 && !this.isLoading();
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

  private async carregarMensagensSalvas(): Promise<void> {
    const mensagensSalvas = carregarMensagens<ChatMessageRaw>();
    if (mensagensSalvas.length > 0) {
      const mensagensConvertidas = await this.converterMensagensSalvas(mensagensSalvas);
      this.messages.set(mensagensConvertidas);
      // Se o chat já estiver aberto, garante scroll para o final
      if (this.isOpen()) {
        setTimeout(() => {
          scrollToBottom(this.messagesContainer, true);
        }, 100);
      }
    } else {
      this.messages.set([this.initialMessage]);
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
          timestamp
        });
      }
    }
    
    return mensagens;
  }

  private configurarPersistenciaMensagens(): void {
    effect(() => {
      const currentMessages = this.messages();
      if (currentMessages.length > 0) {
        // Remove HTML antes de salvar (não é serializável)
        const mensagensParaSalvar = currentMessages.map(msg => ({
          from: msg.from,
          text: msg.text,
          timestamp: msg.timestamp.toISOString()
        }));
        salvarMensagens(mensagensParaSalvar);
      }
    });
  }

  iniciarNovaConversa(): void {
    // Salva o sessionId ANTIGO antes de limpar para limpar o histórico correto no backend
    const sessionIdAntigo = this.sessionId;
    
    // Limpa mensagens no frontend
    this.messages.set([this.initialMessage]);
    
    // Limpa sessionStorage (remove sessionId e mensagens)
    limparSessionStorage();
    
    // Gera novo sessionId
    this.sessionId = obterOuGerarSessionId();
    
    // Limpa o histórico ANTIGO no backend antes de começar nova conversa
    if (sessionIdAntigo) {
      this.chatService.limparHistorico(sessionIdAntigo).subscribe({
        error: () => console.warn('Erro ao limpar histórico no backend')
      });
    }
  }
}


