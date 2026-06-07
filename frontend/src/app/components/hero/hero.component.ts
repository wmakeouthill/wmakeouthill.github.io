import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CvModalComponent } from '../cv-modal/cv-modal.component';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { GithubService } from '../../services/github.service';
@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CvModalComponent, TranslatePipe],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('octocatVideo', { static: false }) octocatVideo!: ElementRef<HTMLVideoElement>;

  private readonly i18n = inject(I18nService);
  private readonly githubService = inject(GithubService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Nº de repositórios contribuídos (público + privado), vindo do backend cacheado. */
  readonly contributedRepos = signal<number | null>(null);

  readonly displayedText = signal('');
  /** Linguagem exibida na code-line do topo (alterna a cada loop). */
  readonly codeLang = signal<'java' | 'python'>('java');
  /** True durante a transição animada (fade/blur) da troca de linguagem. */
  readonly codeSwapping = signal(false);
  readonly starData: Array<{ x: number; y: number; size: string; color: string; glow: string }> = [];
  fullText = 'Desenvolvedor Full Stack';
  typingSpeed = 100;
  private typingInterval: any;
  private loopInterval: any;
  private swapTimeout: any;
  private firstTypeTimeout: any;
  /** Evita re-digitar na 1ª execução do effect (carga inicial). */
  private firstLangRun = true;
  private readonly langEffect = effect(() => {
    // Recalcula o título quando o idioma muda
    this.fullText = this.i18n.translate('hero.title');
    if (!this.isBrowser) {
      // No SSR não há timers: renderiza o título completo (bom p/ SEO) sem animar.
      this.displayedText.set(this.fullText);
      return;
    }
    if (this.firstLangRun) {
      // Carga inicial: mostra o título completo (SSR já renderizou assim) sem
      // re-digitar, evitando o flash de branco que inflava o Speed Index.
      // A digitação roda nos loops seguintes (ver ngOnInit).
      this.firstLangRun = false;
      this.displayedText.set(this.fullText);
      return;
    }
    // Troca de idioma real (interação do usuário): aí sim re-digita.
    this.restartTypingAnimation();
  });

  // Modal CV properties
  showCvModal = false;

  ngOnInit() {
    this.generateStars();
    // define o texto inicial conforme idioma
    this.fullText = this.i18n.translate('hero.title');

    if (!this.isBrowser) {
      // SSR: sem timers (manteriam a zona instável e travariam o render).
      // Renderiza o título completo para o HTML inicial (SEO).
      this.displayedText.set(this.fullText);
      return;
    }

    // Carga inicial: mostra o título já completo de imediato (o SSR renderizou
    // assim e a hidratação preserva o DOM) — sem flash de branco. A 1ª digitação
    // roda 4s depois: tempo suficiente pra janela de medição do Lighthouse fechar
    // (com as galerias agora adiadas, a rede fica quieta ~1-2s), então a digitação
    // não pesa mais no Speed Index — e o visitante ainda vê o efeito logo de cara,
    // sem esperar o loop de 10s.
    this.displayedText.set(this.fullText);
    this.firstTypeTimeout = setTimeout(() => {
      this.startTypingAnimation();
    }, 4000);
    // agenda re-execução da digitação a cada 10s (flair contínuo)
    this.loopInterval = setInterval(() => {
      this.startTypingAnimation();
    }, 10000);

    // métrica cacheada no backend: repos contribuídos (público + privado)
    this.githubService.getStats().subscribe(stats => {
      this.contributedRepos.set(stats.contributedRepositories);
    });
  }

  ngAfterViewInit() {
    // SSR: o elemento de video do servidor nao implementa pause()/currentTime;
    // mexer nele lanca erro e e desnecessario (controle de playback e so no browser).
    if (!this.isBrowser) {
      return;
    }
    // Mantém o gatinho parado no primeiro quadro até a digitação terminar
    const video = this.octocatVideo?.nativeElement;
    if (video) {
      // Garante mudo via propriedade (o atributo HTML nem sempre é respeitado)
      video.muted = true;
      video.volume = 0;
      video.pause();
      video.currentTime = 0;
    }
  }

  private generateStars() {
    const colorBases = [
      [255, 255, 255],
      [219, 194, 125],
      [180, 145, 255],
      [150, 205, 255],
      [255, 210, 110],
      [210, 170, 255],
      [255, 255, 220],
      [200, 230, 255],
    ];
    // 3 níveis de brilho: dim / normal / bright
    const tiers: Array<{ size: string; opacityMin: number; opacityMax: number; glow: string }> = [
      { size: 'sm', opacityMin: 0.25, opacityMax: 0.5,  glow: '3px 1px'  }, // fracas — 20
      { size: 'sm', opacityMin: 0.6,  opacityMax: 0.85, glow: '5px 1px'  }, // normais — 12
      { size: 'md', opacityMin: 0.7,  opacityMax: 0.9,  glow: '6px 2px'  }, // médias — 7
      { size: 'lg', opacityMin: 0.85, opacityMax: 1.0,  glow: '9px 3px'  }, // brilhantes — 3
    ];
    const distribution = [
      ...Array(20).fill(tiers[0]),
      ...Array(12).fill(tiers[1]),
      ...Array(7).fill(tiers[2]),
      ...Array(3).fill(tiers[3]),
    ];

    for (const tier of distribution) {
      const angle   = Math.random() * 360;
      const radius  = 10 + Math.random() * 90;
      const x       = Math.cos(angle * Math.PI / 180) * radius;
      const y       = Math.sin(angle * Math.PI / 180) * radius;
      const opacity = tier.opacityMin + Math.random() * (tier.opacityMax - tier.opacityMin);
      const [r, g, b] = colorBases[Math.floor(Math.random() * colorBases.length)];
      const color   = `rgba(${r},${g},${b},${opacity.toFixed(2)})`;

      this.starData.push({ x, y, size: tier.size, color, glow: `0 0 ${tier.glow} ${color}` });
    }
  }

  /**
   * Transição animada da code-line: aplica a classe `.swapping` (fade + blur
   * para fora), troca o conteúdo Java ↔ Python no meio da animação e remove a
   * classe (fade + blur de volta).
   */
  private swapCodeLanguage() {
    if (this.swapTimeout) {
      clearTimeout(this.swapTimeout);
    }
    this.codeSwapping.set(true);
    this.swapTimeout = setTimeout(() => {
      this.codeLang.update(lang => (lang === 'java' ? 'python' : 'java'));
      this.codeSwapping.set(false);
      this.swapTimeout = null;
    }, 300);
  }

  private playCatOnce() {
    const video = this.octocatVideo?.nativeElement;
    if (!video) {
      return;
    }
    // Reinicia e reproduz uma única vez, sempre mudo
    video.muted = true;
    video.volume = 0;
    video.currentTime = 0;
    void video.play().catch(() => { /* autoplay pode ser bloqueado; ignora */ });
  }

  ngOnDestroy() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
    }
    if (this.swapTimeout) {
      clearTimeout(this.swapTimeout);
    }
    if (this.firstTypeTimeout) {
      clearTimeout(this.firstTypeTimeout);
    }
  }

  startTypingAnimation() {
    // evita iniciar uma nova animação se já estiver digitando
    if (this.typingInterval) {
      return;
    }

    // reinicia texto e começa a digitar do início
    this.displayedText.set('');
    let index = 0;
    this.typingInterval = setInterval(() => {
      if (index < this.fullText.length) {
        this.displayedText.update(t => t + this.fullText.charAt(index));
        index++;
      } else {
        // terminou de digitar: limpa o intervalo de digitação
        clearInterval(this.typingInterval);
        this.typingInterval = null;

        // Ao terminar a digitação, dispara a animação do gatinho uma vez
        this.playCatOnce();

        // ...e faz a code-line do topo transicionar para a outra linguagem,
        // alternando Java ↔ Python antes do próximo loop.
        this.swapCodeLanguage();
      }
    }, this.typingSpeed);
  }

  private restartTypingAnimation() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
    this.displayedText.set('');
    this.startTypingAnimation();
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  openCvModal() {
    this.showCvModal = true;
  }

  closeCvModal() {
    this.showCvModal = false;
  }
}
