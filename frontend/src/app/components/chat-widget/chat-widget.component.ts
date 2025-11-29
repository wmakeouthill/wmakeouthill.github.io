import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  signal,
  computed,
  effect,
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
export class ChatWidgetComponent implements OnDestroy {
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

  constructor() {
    useChatScroll(this.messagesContainer, this.messages, this.isOpen);
    this.configureChatOpenEffects();
    this.configureLoadingEffects();
  }

  ngOnDestroy(): void {
    this.outsideClickDestroy.ngOnDestroy?.();
    this.scrollBlockDestroy.ngOnDestroy?.();
  }

  toggleOpen(): void {
    this.isOpen.update((v) => !v);
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

    this.chatService.enviarMensagem(text).subscribe({
      next: (response: ChatResponse) => {
        this.chatMessagesHandlers.handleAssistantResponse(response).catch(() => {
          this.chatMessagesHandlers.handleAssistantError();
        });
      },
      error: () => this.chatMessagesHandlers.handleAssistantError()
    });
  }

  private canSendMessage(text: string): boolean {
    return text.length > 0 && !this.isLoading();
  }

  private configureChatOpenEffects(): void {
    effect(() => {
      if (this.isOpen()) {
        setTimeout(() => {
          this.applySyntaxHighlighting();
        }, 200);
      }
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
}


