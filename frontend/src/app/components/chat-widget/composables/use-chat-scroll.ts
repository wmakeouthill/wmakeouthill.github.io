import { effect, ElementRef, Signal } from '@angular/core';

export function useChatScroll(
  messagesContainer: ElementRef<HTMLDivElement> | undefined,
  messages: Signal<any[]>,
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

