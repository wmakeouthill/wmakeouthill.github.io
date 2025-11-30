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
    { platform: 'GitHub', url: 'https://github.com/WesleyAugusto', iconSrc: 'assets/icons/github-octocat.svg' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/wcacorreia', iconSrc: 'assets/icons/linkedin.svg' },
    { platform: 'Email', url: 'mailto:wcacorreia1995@gmail.com', iconSrc: 'assets/icons/gmail.svg' }
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
