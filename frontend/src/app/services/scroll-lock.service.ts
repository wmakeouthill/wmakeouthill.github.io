import { Injectable } from '@angular/core';

/**
 * Trava o scroll do fundo enquanto um modal está aberto, mantendo a página
 * exatamente onde estava (sem o "pulo" para o topo e volta).
 *
 * Usa `overflow: hidden` no body (em vez de `position: fixed`), por isso a
 * posição de scroll nunca é alterada — o fundo fica 100% estático ao abrir e
 * ao fechar. Compensa o sumiço da barra de rolagem com padding para evitar
 * deslocamento horizontal do layout.
 *
 * Faz contagem de referências, então múltiplos modais sobrepostos funcionam:
 * só destrava quando o último for fechado.
 */
@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private lockCount = 0;
  private previousPaddingRight = '';
  private previousOverflow = '';

  lock(): void {
    if (this.lockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      this.previousOverflow = document.body.style.overflow;
      this.previousPaddingRight = document.body.style.paddingRight;

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    this.lockCount++;
  }

  unlock(): void {
    if (this.lockCount === 0) {
      return;
    }
    this.lockCount--;
    if (this.lockCount === 0) {
      document.body.style.overflow = this.previousOverflow;
      document.body.style.paddingRight = this.previousPaddingRight;
      document.body.classList.remove('modal-open');
    }
  }
}
