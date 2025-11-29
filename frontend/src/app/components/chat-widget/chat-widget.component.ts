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
import { ChatService, ChatResponse } from '../../services/chat.service';

interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
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

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

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
  }

  ngOnDestroy(): void {
    if (this.documentClickHandler) {
      document.removeEventListener('mousedown', this.documentClickHandler);
    }
  }

  toggleOpen() {
    this.isOpen.update((v) => !v);
  }

  handleInputChange(value: string) {
    this.inputText.set(value);
  }

  sendMessage() {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) {
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

  private addUserMessage(text: string) {
    const userMessage: ChatMessage = {
      from: 'user',
      text,
      timestamp: new Date()
    };

    this.messages.update((arr) => [...arr, userMessage]);
  }

  private handleAssistantResponse(response: ChatResponse) {
    const reply = response?.reply?.trim();
    if (reply) {
      const assistantMessage: ChatMessage = {
        from: 'assistant',
        text: reply,
        timestamp: new Date()
      };
      this.messages.update((arr) => [...arr, assistantMessage]);
    }
    this.isLoading.set(false);
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
      // Reage a novas mensagens e à abertura do painel
      const _messages = this.messages();
      const isPanelOpen = this.isOpen();
      if (!isPanelOpen || _messages.length === 0) {
        return;
      }

      queueMicrotask(() => {
        const element = this.messagesContainer?.nativeElement;
        if (!element) {
          return;
        }
        element.scrollTop = element.scrollHeight;
      });
    });
  }

  private registerOutsideClickListener() {
    this.documentClickHandler = (event: MouseEvent) => {
      const host = this.hostElement.nativeElement;
      const target = event.target as Node | null;

      if (!this.isOpen() || !target) {
        return;
      }

      const clickedInside = host.contains(target);
      if (!clickedInside) {
        this.isOpen.set(false);
      }
    };

    document.addEventListener('mousedown', this.documentClickHandler);
  }
}


