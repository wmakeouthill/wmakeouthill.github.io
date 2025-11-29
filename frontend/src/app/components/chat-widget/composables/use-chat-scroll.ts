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

    queueMicrotask(() => {
      const element = messagesContainer?.nativeElement;
      if (!element) {
        return;
      }
      element.scrollTop = element.scrollHeight;
    });
  });
}

