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
  @ViewChild('nebulaLottie', { static: false }) nebulaLottie!: ElementRef<HTMLDivElement>;

  private readonly i18n = inject(I18nService);

  readonly displayedText = signal('');
  fullText = 'Desenvolvedor Full Stack';
  typingSpeed = 100;
  private typingInterval: any;
  private loopInterval: any;
  private lottieAnimation: any;
  private nebulaAnimation: any;
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

    // Nebula
    if (this.nebulaLottie?.nativeElement) {
      this.nebulaAnimation = lottie.loadAnimation({
        container: this.nebulaLottie.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/nebula.json'
      });
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
    if (this.nebulaAnimation) {
      this.nebulaAnimation.destroy();
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
