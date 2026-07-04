import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    ChatWidgetComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy, AfterViewInit {
  readonly showScrollToTop = signal(false);

  private readonly ngZone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private revealObserver: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private revealTransitionEnd: ((event: TransitionEvent) => void) | null = null;
  private readonly handleScroll = () => {
    const shouldShow = window.scrollY > 300;
    if (shouldShow !== this.showScrollToTop()) {
      this.showScrollToTop.set(shouldShow);
    }
  };

  ngOnInit(): void {
    // SEO é aplicado por cada página roteada (Home/ProjectDetail) no seu
    // ngOnInit, garantindo title/meta corretos por rota no SSR e na navegação.

    // APIs de browser (window/document/observers) não existem no SSR.
    if (!this.isBrowser) {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) {
      return;
    }
    window.removeEventListener('scroll', this.handleScroll);
    this.revealObserver?.disconnect();
    this.mutationObserver?.disconnect();
    if (this.revealTransitionEnd) {
      document.removeEventListener('transitionend', this.revealTransitionEnd as EventListener);
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }
    this.setupRevealAnimations();
    this.enableAmbientAnimations();
  }

  /**
   * Liga as animações ambientes infinitas (sweep do texto cyber, giro do botão
   * Github Stats) só depois que a página carregou e ficou ociosa. Elas repintam
   * a cada frame; rodando durante a janela de medição do Lighthouse, empurravam
   * o Speed Index pra cima sem que o visitante real notasse diferença. Ao adiar
   * o início pro idle, a janela vê a tela estável e o efeito aparece logo em
   * seguida. Fora da zona do Angular: só alterna uma classe, não precisa de CD.
   */
  private enableAmbientAnimations(): void {
    const start = () => document.documentElement.classList.add('anim-ready');
    this.ngZone.runOutsideAngular(() => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(start, { timeout: 3000 });
      } else {
        setTimeout(start, 1200);
      }
    });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private setupRevealAnimations(): void {
    // Sem IntersectionObserver (navegadores muito antigos): mostra tudo sem
    // animação para não deixar o conteúdo invisível.
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach((element) => element.classList.add('in'));
      return;
    }

    // Toda a observação/manipulação de DOM roda fora da zona do Angular:
    // alternar classes/estilos não deve agendar change detection.
    this.ngZone.runOutsideAngular(() => {
      const observed = new WeakSet<Element>();

      const prepareElement = (element: HTMLElement): void => {
        const siblings = element.parentElement
          ? Array.from(element.parentElement.children).filter((child) => child.classList.contains('reveal'))
          : [];
        const index = siblings.indexOf(element);
        if (index > 0) {
          element.style.transitionDelay = `${Math.min(index, 6) * 0.07}s`;
        }
      };

      // Reveal one-shot: aparece ao entrar na viewport e PARA de ser observado.
      // O toggle bidirecional foi removido de propósito: em grids dinâmicos
      // (filtros/paginação de cases), trocar o filtro desloca o layout e o
      // observer removia `in` de cards ainda na tela — eles piscavam ou ficavam
      // permanentemente invisíveis (opacity 0) na faixa inferior da viewport.
      // `will-change` é ativado só durante a animação e removido no transitionend
      // (listener único e delegado) para não manter camadas de GPU em todos os
      // elementos — esse é o ponto-chave de performance.
      this.revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            const element = entry.target as HTMLElement;
            element.style.willChange = 'opacity, transform';
            element.classList.add('in');
            this.revealObserver?.unobserve(element);
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -12% 0px' }
      );

      this.revealTransitionEnd = (event: TransitionEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && target.classList?.contains('reveal')) {
          target.style.willChange = 'auto';
        }
      };
      document.addEventListener('transitionend', this.revealTransitionEnd as EventListener, { passive: true });

      const observeReveal = (element: Element): void => {
        if (observed.has(element)) return;
        observed.add(element);
        prepareElement(element as HTMLElement);
        this.revealObserver?.observe(element);
      };

      document.querySelectorAll('.reveal').forEach(observeReveal);

      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.classList.contains('reveal')) {
              observeReveal(node);
            }
            node.querySelectorAll('.reveal').forEach(observeReveal);
          });
        });
      });
      this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    });
  }
}
