import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isScrolled = false;
  isMobileMenuOpen = false;

  navItems = [
    { label: 'Início', section: 'hero' },
    { label: 'Sobre', section: 'about' },
    { label: 'Skills', section: 'skills' },
    { label: 'Experiência', section: 'experience' },
    { label: 'Educação', section: 'education' },
    { label: 'Projetos', section: 'projects' },
    { label: 'Certificações', section: 'certifications' },
    { label: 'Contato', section: 'contact' }
  ];

  socialLinks = [
    { platform: 'GitHub', url: 'https://github.com/wmakeouthill', icon: '🔗' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/seu-perfil', icon: '💼' }
  ];

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
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

      this.isMobileMenuOpen = false;
    }
  }
}
