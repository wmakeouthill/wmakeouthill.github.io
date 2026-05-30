import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

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
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    HeroComponent,
    AboutComponent,
    SkillsComponent,
    ExperienceComponent,
    EducationComponent,
    ProjectsComponent,
    CertificationsComponent,
    ContactComponent,
    FooterComponent,
    ChatWidgetComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy, AfterViewInit {
  readonly showScrollToTop = signal(false);

  private readonly ngZone = inject(NgZone);
  private revealObserver: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private readonly handleScroll = () => {
    const shouldShow = window.scrollY > 300;
    if (shouldShow !== this.showScrollToTop()) {
      this.showScrollToTop.set(shouldShow);
    }
  };

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    this.revealObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  ngAfterViewInit(): void {
    this.setupRevealAnimations();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private setupRevealAnimations(): void {
    const observed = new WeakSet<Element>();

    const prepareElement = (element: HTMLElement): void => {
      const siblings = element.parentElement
        ? Array.from(element.parentElement.children).filter((child) => child.classList.contains('reveal'))
        : [];
      const index = siblings.indexOf(element);
      if (index > 0) {
        element.style.transitionDelay = `${Math.min(index, 6) * 0.07}s`;
      }
    };

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const observeReveal = (element: Element): void => {
      if (observed.has(element)) return;
      observed.add(element);
      prepareElement(element as HTMLElement);
      this.revealObserver?.observe(element);
    };

    document.querySelectorAll('.reveal').forEach(observeReveal);
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains('reveal')) {
            observeReveal(node);
          }
          node.querySelectorAll('.reveal').forEach(observeReveal);
        });
      });
    });
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => {
      document.querySelectorAll('.reveal:not(.in)').forEach((element) => element.classList.add('in'));
    }, 1600);
  }
}
