import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit, AfterViewInit {
  private readonly i18n = inject(I18nService);

  @ViewChild('highlightsContainer') highlightsContainer!: ElementRef;
  readonly personalInfo = {
    name: 'Wesley de Carvalho Augusto Correia',
    title: computed(() => this.i18n.translate('about.titleRole')),
    yearsOfExperience: 6,
    age: 29,
    location: 'Duque de Caxias, RJ, Brasil',
    email: 'wcacorreia1995@gmail.com',
    driverLicense: 'AB',
    available: true,
    bio: computed(() => {
      const value = this.i18n.translate('about.bio');
      return Array.isArray(value) ? value : [value];
    })
  };

  readonly highlights = computed(() => [
    { icon: '💼', title: this.i18n.translate('about.highlights.experience.title'), value: this.i18n.translate('about.highlights.experience.value') },
    { icon: '🎓', title: this.i18n.translate('about.highlights.education.title'), value: this.i18n.translate('about.highlights.education.value') },
    { icon: '🚀', title: this.i18n.translate('about.highlights.projects.title'), value: this.i18n.translate('about.highlights.projects.value') },
    { icon: '✅', title: this.i18n.translate('about.highlights.status.title'), value: this.i18n.translate('about.highlights.status.value') }
  ]);

  readonly softSkills = computed(() => {
    const skills = this.i18n.translate('about.softSkills.items');
    return Array.isArray(skills) ? skills : [skills];
  });

  readonly mainStack = [
    'Java', 'Spring', 'Spring Boot', 'Maven', 'Angular', 'TypeScript', 'SQL', 'JavaScript', 'CSS', 'SCSS', 'HTML', 'Docker', 'Podman', 'Kubernetes', 'Compose', 'Electron', 'Liquibase', 'Prometheus', 'Grafana', 'Micrometer', 'AlertManager', 'Cloud', 'PostgreSQL', 'MySQL', 'Oracle'
  ];

  ngOnInit() {
    // Component initialization
  }

  ngAfterViewInit() {
    this.setupScrollAnimations();
  }

  private setupScrollAnimations() {
    const observerOptions = {
      threshold: [0.3, 0.6],
      rootMargin: '0px 0px -20px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          entry.target.classList.add('animate-in', 'auto-hover');
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.3) {
          entry.target.classList.remove('auto-hover');
        }
      });
    }, observerOptions);

    // Observe highlight cards
    const highlightCards = this.highlightsContainer?.nativeElement?.querySelectorAll('.highlight-card');
    highlightCards?.forEach((card: Element) => {
      observer.observe(card);
    });
  }
}
