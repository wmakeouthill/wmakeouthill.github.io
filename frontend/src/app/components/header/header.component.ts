import { ChangeDetectionStrategy, Component, NgZone, PLATFORM_ID, signal, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly isScrolled = signal(false);
  readonly isMobileMenuOpen = signal(false);
  readonly activeSection = signal<string>('hero');

  private readonly ngZone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private sectionObserver: IntersectionObserver | null = null;

  private readonly handleScroll = () => {
    const scrollY = window.scrollY;
    this.isScrolled.set(scrollY > 50);
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

  ngOnInit(): void {
    // IntersectionObserver/window não existem no SSR.
    if (!this.isBrowser) {
      return;
    }
    this.initSectionObserver();
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }
    this.observeSections();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) {
      return;
    }
    window.removeEventListener('scroll', this.handleScroll);
    this.sectionObserver?.disconnect();
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

}
