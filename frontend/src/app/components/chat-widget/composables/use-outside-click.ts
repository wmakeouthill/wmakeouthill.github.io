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

  document.addEventListener('mousedown', documentClickHandler);

  return {
    ngOnDestroy: () => {
      document.removeEventListener('mousedown', documentClickHandler);
    }
  };
}

