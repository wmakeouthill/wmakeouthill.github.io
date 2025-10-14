import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements OnInit, OnDestroy {
  displayedText = '';
  fullText = 'Desenvolvedor Full Stack Junior';
  typingSpeed = 100;
  private typingInterval: any;
  private loopInterval: any;

  ngOnInit() {
    // inicia a primeira execução imediatamente
    this.startTypingAnimation();
    // agenda re-execução a cada 8 segundos
    this.loopInterval = setInterval(() => {
      this.startTypingAnimation();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
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

  downloadCV() {
    // Implementar download do CV
    console.log('Download CV');
    alert('Funcionalidade de download do CV será implementada em breve!');
  }
}
