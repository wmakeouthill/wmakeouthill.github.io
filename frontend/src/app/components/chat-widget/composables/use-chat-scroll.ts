import { effect, ElementRef, Signal } from '@angular/core';
import { ChatMessage } from '../components/chat-message.component';

export function useChatScroll(
  messagesContainer: ElementRef<HTMLDivElement> | undefined,
  messages: Signal<ChatMessage[]>,
  isOpen: Signal<boolean>
): void {
  effect(() => {
    const _messages = messages();
    const isPanelOpen = isOpen();
    
    if (!isPanelOpen || _messages.length === 0) {
      return;
    }

    // Aguarda múltiplos frames para garantir que o DOM foi completamente renderizado
    // Isso é necessário porque o markdown e syntax highlighting são aplicados de forma assíncrona
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const element = messagesContainer?.nativeElement;
          if (!element) {
            return;
          }
          element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      });
    });
  });
}

export function scrollToBottom(messagesContainer: ElementRef<HTMLDivElement> | undefined): void {
  if (!messagesContainer?.nativeElement) {
    return;
  }
  
  const element = messagesContainer.nativeElement;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    });
  });
}

