import { effect, ElementRef, Signal } from '@angular/core';
import { ChatMessage } from '../components/chat-message.component';

export function useChatScroll(
  messagesContainer: ElementRef<HTMLDivElement> | undefined,
  messages: Signal<ChatMessage[]>,
  isOpen: Signal<boolean>
): void {
  let wasOpen = false;

  effect(() => {
    const _messages = messages();
    const isPanelOpen = isOpen();
    
    if (!isPanelOpen) {
      wasOpen = false;
      return;
    }

    // Se acabou de abrir (não estava aberto antes), scroll instantâneo
    const justOpened = !wasOpen;
    wasOpen = true;

    if (_messages.length === 0) {
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
          // Scroll instantâneo se acabou de abrir, suave caso contrário
          element.scrollTo({
            top: element.scrollHeight,
            behavior: justOpened ? 'auto' : 'smooth'
          });
        }, 100);
      });
    });
  });
}

export function scrollToBottom(messagesContainer: ElementRef<HTMLDivElement> | undefined, instant: boolean = false): void {
  if (!messagesContainer?.nativeElement) {
    return;
  }
  
  const element = messagesContainer.nativeElement;
  const scrollBehavior: ScrollBehavior = instant ? 'auto' : 'smooth';
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: scrollBehavior
      });
    });
  });
}

