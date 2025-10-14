import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  quickLinks = [
    { label: 'Início', section: 'hero' },
    { label: 'Sobre', section: 'about' },
    { label: 'Skills', section: 'skills' },
    { label: 'Projetos', section: 'projects' },
    { label: 'Contato', section: 'contact' }
  ];

  socialLinks = [
    { platform: 'GitHub', url: 'https://github.com/wmakeouthill', icon: '🔗' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/seu-perfil', icon: '💼' },
    { platform: 'Email', url: 'mailto:seuemail@exemplo.com', icon: '✉️' }
  ];

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
}
