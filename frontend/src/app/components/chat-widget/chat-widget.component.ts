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
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatService, ChatResponse } from '../../services/chat.service';
import { MarkdownChatService } from '../../services/markdown-chat.service';

interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
  html?: SafeHtml;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly markdownChatService = inject(MarkdownChatService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput') private chatInput?: ElementRef<HTMLInputElement>;

  readonly scrollToTopVisible = input<boolean>(false);

  isOpen = signal(false);
  isLoading = signal(false);
  inputText = signal('');
  messages = signal<ChatMessage[]>([]);

  readonly canSend = computed(
    () => this.inputText().trim().length > 0 && !this.isLoading()
  );

  private documentClickHandler?: (event: MouseEvent) => void;

  constructor() {
    this.configureAutoScroll();
    this.registerOutsideClickListener();
    this.configureChatOpenEffects();
  }

  ngOnDestroy(): void {
    if (this.documentClickHandler) {
      document.removeEventListener('mousedown', this.documentClickHandler);
    }
    this.unblockPageScroll();
  }

  toggleOpen() {
    this.isOpen.update((v) => !v);
  }

  handleInputChange(value: string) {
    this.inputText.set(value);
  }

  sendMessage() {
    const text = this.inputText().trim();
    if (!this.canSendMessage(text)) {
      return;
    }

    this.addUserMessage(text);
    this.inputText.set('');
    this.isLoading.set(true);

    this.chatService.enviarMensagem(text).subscribe({
      next: (response: ChatResponse) => this.handleAssistantResponse(response),
      error: () => this.handleAssistantError()
    });
  }

  private canSendMessage(text: string): boolean {
    return text.length > 0 && !this.isLoading();
  }

  private addUserMessage(text: string) {
    const userMessage: ChatMessage = {
      from: 'user',
      text,
      timestamp: new Date()
    };
    this.messages.update((arr) => [...arr, userMessage]);
  }

  private async handleAssistantResponse(response: ChatResponse) {
    const reply = response?.reply?.trim();
    if (!reply) {
      this.isLoading.set(false);
      return;
    }

    const html = await this.markdownChatService.renderMarkdownToHtml(reply);
    const assistantMessage = this.createAssistantMessage(reply, html);
    this.messages.update((arr) => [...arr, assistantMessage]);
    this.isLoading.set(false);
    this.applySyntaxHighlighting();
  }

  private createAssistantMessage(text: string, html: string): ChatMessage {
    return {
      from: 'assistant',
      text,
      html: this.sanitizer.bypassSecurityTrustHtml(html),
      timestamp: new Date()
    };
  }

  private handleAssistantError() {
    const errorMessage: ChatMessage = {
      from: 'assistant',
      text: 'Não foi possível falar com a IA agora. Tente novamente em alguns instantes.',
      timestamp: new Date()
    };
    this.messages.update((arr) => [...arr, errorMessage]);
    this.isLoading.set(false);
  }

  private configureAutoScroll() {
    effect(() => {
      if (!this.shouldScroll()) {
        return;
      }
      this.scrollToBottom();
    });
  }

  private shouldScroll(): boolean {
    return this.isOpen() && this.messages().length > 0;
  }

  private scrollToBottom() {
    queueMicrotask(() => {
      const element = this.messagesContainer?.nativeElement;
      if (!element) {
        return;
      }
      element.scrollTop = element.scrollHeight;
    });
  }

  private registerOutsideClickListener() {
    this.documentClickHandler = (event: MouseEvent) => {
      if (!this.shouldCloseOnOutsideClick(event)) {
        return;
      }
      this.isOpen.set(false);
    };
    document.addEventListener('mousedown', this.documentClickHandler);
  }

  private shouldCloseOnOutsideClick(event: MouseEvent): boolean {
    if (!this.isOpen()) {
      return false;
    }

    const host = this.hostElement.nativeElement;
    const target = event.target as Node | null;
    
    if (!target) {
      return false;
    }

    return !host.contains(target);
  }

  private configureChatOpenEffects() {
    effect(() => {
      const isOpen = this.isOpen();
      this.handleChatOpenState(isOpen);
    });
  }

  private handleChatOpenState(isOpen: boolean) {
    if (isOpen) {
      this.blockPageScroll();
      this.focusChatInput();
      // Aplicar syntax highlighting em mensagens existentes quando o chat abrir
      setTimeout(() => {
        this.applySyntaxHighlighting();
      }, 200);
    } else {
      this.unblockPageScroll();
    }
  }

  private blockPageScroll() {
    document.body.style.overflow = 'hidden';
  }

  private unblockPageScroll() {
    document.body.style.overflow = '';
  }

  private focusChatInput() {
    queueMicrotask(() => {
      this.chatInput?.nativeElement?.focus();
    });
  }

  private applySyntaxHighlighting() {
    setTimeout(() => {
      const messagesContainer = this.messagesContainer?.nativeElement;
      if (!messagesContainer || typeof (window as any).Prism === 'undefined') {
        return;
      }

      // Processar apenas code blocks dentro de pre (não código inline)
      const codeBlocks = messagesContainer.querySelectorAll('pre code:not([data-prism-processed])');
      codeBlocks.forEach((codeBlockElement) => {
        const codeBlock = codeBlockElement as HTMLElement;
        
        // Se não tiver classe de linguagem, tentar detectar
        if (!codeBlock.className.includes('language-')) {
          const parentDiv = codeBlock.closest('.code-block-enhanced');
          const languageSpan = parentDiv?.querySelector('.code-language');
          if (languageSpan) {
            const language = languageSpan.textContent?.toLowerCase().trim() || 'text';
            codeBlock.className = `language-${language}`;
          } else {
            // Tentar detectar linguagem pelo contexto do código
            const codeText = codeBlock.textContent || '';
            if (codeText.trim().startsWith('{') || codeText.includes('function') || codeText.includes('const ')) {
              codeBlock.className = 'language-javascript';
            } else if (codeText.includes('public class') || codeText.includes('@')) {
              codeBlock.className = 'language-java';
            } else if (codeText.includes('import ') || codeText.includes('export ')) {
              codeBlock.className = 'language-typescript';
            } else {
              codeBlock.className = 'language-text';
            }
          }
        }

        try {
          (window as any).Prism.highlightElement(codeBlock, false);
        } catch (error) {
          console.warn('Erro ao aplicar syntax highlighting:', error);
        }
      });
    }, 100);
  }
}


