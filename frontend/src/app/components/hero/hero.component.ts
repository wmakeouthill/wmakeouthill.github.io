import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CvModalComponent } from '../cv-modal/cv-modal.component';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';
@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CvModalComponent, TranslatePipe],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('octocatLottie', { static: false }) octocatLottie!: ElementRef<HTMLDivElement>;

  private readonly i18n = inject(I18nService);

  readonly displayedText = signal('');
  readonly starData: Array<{ x: number; y: number; size: string; color: string; glow: string }> = [];
  fullText = 'Desenvolvedor Full Stack';
  typingSpeed = 100;
  private typingInterval: any;
  private loopInterval: any;
  private lottieAnimation: any;
  private hasPlayedInitial = false;
  private isInitialPlayComplete = false;
  private readonly langEffect = effect(() => {
    // Recalcula o título quando o idioma muda
    this.fullText = this.i18n.translate('hero.title');
    this.restartTypingAnimation();
  });

  // Modal CV properties
  showCvModal = false;

  ngOnInit() {
    this.generateStars();
    // define o texto inicial conforme idioma
    this.fullText = this.i18n.translate('hero.title');
    // inicia a primeira execução imediatamente
    this.startTypingAnimation();
    // agenda re-execução a cada 8 segundos
    this.loopInterval = setInterval(() => {
      this.startTypingAnimation();
    }, 10000);
  }

  async ngAfterViewInit() {
    const lottie = (await import('lottie-web')).default;

    // Octocat
    if (this.octocatLottie?.nativeElement) {
      this.lottieAnimation = lottie.loadAnimation({
        container: this.octocatLottie.nativeElement,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: '/octocat.json',
        rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
      });
      this.playLottieOnce();
      this.hasPlayedInitial = true;
      this.lottieAnimation.addEventListener('complete', () => {
        this.isInitialPlayComplete = true;
      });
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

  private playLottieOnce() {
    if (this.lottieAnimation) {
      // Para a animação atual e volta para o início
      this.lottieAnimation.stop();
      this.lottieAnimation.goToAndPlay(0, true);
    }
  }

  ngOnDestroy() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
    }
    if (this.lottieAnimation) {
      this.lottieAnimation.destroy();
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

        // Reproduz o Lottie quando termina a digitação (apenas após a primeira reprodução completa)
        if (this.isInitialPlayComplete) {
          this.playLottieOnce();
        }
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
