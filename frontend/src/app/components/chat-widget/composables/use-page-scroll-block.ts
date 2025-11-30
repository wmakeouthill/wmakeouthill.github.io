import { effect, Signal, OnDestroy } from '@angular/core';

export function usePageScrollBlock(isOpen: Signal<boolean>): OnDestroy {
  effect(() => {
    if (isOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  return {
    ngOnDestroy: () => {
      document.body.style.overflow = '';
    }
  };
}

