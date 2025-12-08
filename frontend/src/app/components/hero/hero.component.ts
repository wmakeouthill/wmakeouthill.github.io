import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CvModalComponent } from '../cv-modal/cv-modal.component';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';
import lottie from 'lottie-web';

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

  displayedText = '';
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
    // define o texto inicial conforme idioma
    this.fullText = this.i18n.translate('hero.title');
    // inicia a primeira execução imediatamente
    this.startTypingAnimation();
    // agenda re-execução a cada 8 segundos
    this.loopInterval = setInterval(() => {
      this.startTypingAnimation();
    }, 10000);
  }

  ngAfterViewInit() {
    // Inicializa a animação Lottie
    if (this.octocatLottie?.nativeElement) {
      this.lottieAnimation = lottie.loadAnimation({
        container: this.octocatLottie.nativeElement,
        renderer: 'svg',
        loop: false, // Não loop infinito
        autoplay: false, // Não reproduz automaticamente
        path: '/octocat.json',
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice'
        }
      });

      // Reproduz uma vez na inicialização
      this.playLottieOnce();
      this.hasPlayedInitial = true;

      // Aguarda a primeira reprodução terminar para marcar como completa
      this.lottieAnimation.addEventListener('complete', () => {
        this.isInitialPlayComplete = true;
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
  }

  startTypingAnimation() {
    // evita iniciar uma nova animação se já estiver digitando
    if (this.typingInterval) {
      return;
    }

    // reinicia texto e começa a digitar do início
    this.displayedText = '';
    let index = 0;
    this.typingInterval = setInterval(() => {
      if (index < this.fullText.length) {
        this.displayedText += this.fullText.charAt(index);
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
    this.displayedText = '';
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
