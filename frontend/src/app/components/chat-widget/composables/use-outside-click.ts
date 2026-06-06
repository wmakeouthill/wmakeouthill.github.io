import { WritableSignal, ElementRef, OnDestroy } from '@angular/core';

export function useOutsideClick(
  hostElement: ElementRef<HTMLElement>,
  isOpen: WritableSignal<boolean>
): OnDestroy {
  const documentClickHandler = (event: MouseEvent) => {
    const host = hostElement.nativeElement;
    const target = event.target as Node | null;

    if (!isOpen() || !target) {
      return;
    }

    const clickedInside = host.contains(target);
    if (!clickedInside) {
      isOpen.set(false);
    }
  };

  // document não existe no SSR; o listener só faz sentido no browser.
  const temDocument = typeof document !== 'undefined';
  if (temDocument) {
    document.addEventListener('mousedown', documentClickHandler);
  }

  return {
    ngOnDestroy: () => {
      if (temDocument) {
        document.removeEventListener('mousedown', documentClickHandler);
      }
    }
  };
}

