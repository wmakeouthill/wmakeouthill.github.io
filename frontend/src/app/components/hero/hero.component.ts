import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CvModalComponent } from '../cv-modal/cv-modal.component';
import lottie from 'lottie-web';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, CvModalComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('octocatLottie', { static: false }) octocatLottie!: ElementRef<HTMLDivElement>;

  displayedText = '';
  // Texto exibido na animação do hero
  fullText = 'Desenvolvedor Full Stack';
  typingSpeed = 100;
  private typingInterval: any;
  private loopInterval: any;
  private lottieAnimation: any;
  private hasPlayedInitial = false;
  private isInitialPlayComplete = false;

  // Modal CV properties
  showCvModal = false;

  ngOnInit() {
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
