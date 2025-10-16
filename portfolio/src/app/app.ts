import { Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MarkdownService } from './services/markdown.service';

import { HeaderComponent } from './components/header/header.component';
import { HeroComponent } from './components/hero/hero.component';
import { AboutComponent } from './components/about/about.component';
import { SkillsComponent } from './components/skills/skills.component';
import { ExperienceComponent } from './components/experience/experience.component';
import { EducationComponent } from './components/education/education.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { CertificationsComponent } from './components/certifications/certifications.component';
import { ContactComponent } from './components/contact/contact.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    HeaderComponent,
    HeroComponent,
    AboutComponent,
    SkillsComponent,
    ExperienceComponent,
    EducationComponent,
    ProjectsComponent,
    CertificationsComponent,
    ContactComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  showScrollToTop = false;

  constructor(private readonly markdownService: MarkdownService) { }

  ngOnInit() {
    console.log('🚀 App inicializado - aguardando página carregar completamente...');

    // Aguardar DOM + recursos carregados (100% completo)
    if (document.readyState === 'complete') {
      this.startPreloading();
    } else {
      window.addEventListener('load', () => {
        // Aguardar mais um pouco para garantir que tudo está renderizado
        setTimeout(() => {
          this.startPreloading();
        }, 1000);
      });
    }
  }

  private startPreloading() {
    console.log('✅ Página 100% carregada - iniciando pré-carregamento em 1 segundo...');

    // Aguardar mais 1 segundo para garantir que não interfere com nada
    setTimeout(() => {
      console.log('⏰ Iniciando pré-carregamento de markdowns e SVGs em background...');
      this.markdownService.preloadAllMermaidDiagrams().catch(error => {
        console.error('Erro ao pré-carregar diagramas:', error);
      });
    }, 1000);
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.showScrollToTop = window.scrollY > 300;
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
