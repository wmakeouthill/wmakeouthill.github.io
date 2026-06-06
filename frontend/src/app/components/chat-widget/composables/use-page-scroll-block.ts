import { effect, Signal, OnDestroy } from '@angular/core';

export function usePageScrollBlock(isOpen: Signal<boolean>): OnDestroy {
  const temDocument = typeof document !== 'undefined';
  effect(() => {
    // document.body não existe no SSR.
    if (!temDocument) {
      return;
    }
    if (isOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  return {
    ngOnDestroy: () => {
      if (temDocument) {
        document.body.style.overflow = '';
      }
    }
  };
}

