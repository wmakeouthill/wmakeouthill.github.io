import { ChangeDetectionStrategy, Component, NgZone, signal, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LanguageSelectorComponent, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly isScrolled = signal(false);
  readonly isMobileMenuOpen = signal(false);
  readonly showLanguageHint = signal(true);
  readonly activeSection = signal<string>('hero');

  private readonly ngZone = inject(NgZone);
  private hintTimeoutId: number | undefined;
  private sectionObserver: IntersectionObserver | null = null;

  private readonly handleScroll = () => {
    const scrollY = window.scrollY;
    this.isScrolled.set(scrollY > 50);
    if (scrollY <= 12 && !this.showLanguageHint()) {
      this.showLanguageHint.set(true);
      this.scheduleHintAutoHide();
    }
  };

  readonly navItems = [
    { labelKey: 'header.home', section: 'hero' },
    { labelKey: 'header.about', section: 'about' },
    { labelKey: 'header.skills', section: 'skills' },
    { labelKey: 'header.experience', section: 'experience' },
    { labelKey: 'header.education', section: 'education' },
    { labelKey: 'header.projects', section: 'projects' },
    { labelKey: 'header.certifications', section: 'certifications' },
    { labelKey: 'header.contact', section: 'contact' }
  ];

  readonly socialLinks = [
    { platform: 'GitHub', url: 'https://github.com/wmakeouthill', iconSrc: 'assets/icons/github-octocat.svg' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/wcacorreia', iconSrc: 'assets/icons/linkedin.svg' }
  ];

  constructor() {
    this.scheduleHintAutoHide();
  }

  ngOnInit(): void {
    this.initSectionObserver();
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    });
  }

  ngAfterViewInit(): void {
    this.observeSections();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    this.sectionObserver?.disconnect();
    if (this.hintTimeoutId) {
      clearTimeout(this.hintTimeoutId);
    }
  }

  private initSectionObserver(): void {
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.activeSection.set(entry.target.id);
        }
      });
    }, options);
  }

  private observeSections(): void {
    this.navItems.forEach((item) => {
      const section = document.getElementById(item.section);
      if (section && this.sectionObserver) {
        this.sectionObserver.observe(section);
      }
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((open) => !open);
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

      this.isMobileMenuOpen.set(false);
    }
  }

  private scheduleHintAutoHide(): void {
    if (!this.showLanguageHint()) return;
    if (this.hintTimeoutId) {
      clearTimeout(this.hintTimeoutId);
    }
    this.hintTimeoutId = window.setTimeout(() => this.dismissLanguageHint(), 7000);
  }

  dismissLanguageHint(): void {
    if (!this.showLanguageHint()) return;
    this.showLanguageHint.set(false);
    if (this.hintTimeoutId) {
      clearTimeout(this.hintTimeoutId);
      this.hintTimeoutId = undefined;
    }
  }
}
