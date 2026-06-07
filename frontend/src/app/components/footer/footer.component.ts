import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  techStack = [
    { name: 'Angular', icon: '🅰️' },
    { name: 'TypeScript', icon: '📘' },
    { name: 'Java', icon: '☕' },
    { name: 'Spring Boot', icon: '🌱' }
  ];

  quickLinks = [
    { labelKey: 'header.home', section: 'hero' },
    { labelKey: 'header.about', section: 'about' },
    { labelKey: 'header.skills', section: 'skills' },
    { labelKey: 'header.projects', section: 'projects' },
    { labelKey: 'header.contact', section: 'contact' }
  ];

  socialLinks = [
    { platform: 'GitHub', url: 'https://github.com/WesleyAugusto', iconSrc: 'assets/icons/github-octocat.svg' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/wcacorreia', iconSrc: 'assets/icons/linkedin.svg' },
    { platform: 'X', url: 'https://twitter.com/wmakeouthill', iconSrc: 'assets/icons/x.svg' },
    { platform: 'Reddit', url: 'https://reddit.com/user/wmakeouthill', iconSrc: 'assets/icons/reddit.svg' },
    { platform: 'WhatsApp', url: 'https://wa.me/5521983866676?text=Olá!%20Vi%20seu%20portfólio%20e%20gostaria%20de%20entrar%20em%20contato.', iconSrc: 'assets/icons/whatsapp.svg' },
    { platform: 'Email', url: 'mailto:wcacorreia1995@gmail.com', iconSrc: 'assets/icons/gmail.svg' }
  ];

  scrollToSection(sectionId: string, event?: Event) {
    event?.preventDefault();
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
