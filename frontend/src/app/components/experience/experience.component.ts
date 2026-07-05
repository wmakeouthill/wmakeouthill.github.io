import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, PLATFORM_ID, ViewChild, computed, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Experience } from '../../models/interfaces';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-experience',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.css'
})
export class ExperienceComponent implements OnInit, AfterViewInit {
  private readonly i18n = inject(I18nService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  @ViewChild('experienceContainer') experienceContainer!: ElementRef;
  private readonly baseExperiences: Array<Experience & { key: string }> = [
    {
      key: 'experience.items.exp1',
      id: 1,
      company: 'AutoU',
      position: '',
      badgeLabel: undefined,
      startDate: '2026-02',
      endDate: null,
      current: true,
      location: '',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Python', 'FastAPI', 'google-genai / Responses API', 'LangGraph', 'RAG', 'YOLO', 'Prophet', 'BayBE', 'Gemini Vision', 'pgvector', 'React 19', 'AWS (S3/Lambda/DynamoDB)', 'Google Cloud Run', 'Pub/Sub', 'Azure', 'Prometheus/Grafana', 'Leaflet']
    },
    {
      key: 'experience.items.exp7',
      id: 7,
      company: 'Freelancer',
      position: '',
      badgeLabel: undefined,
      startDate: '2025-01',
      endDate: null,
      current: true,
      location: '',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Java 21', 'Spring Boot 3', 'Angular 20', 'Python', 'FastAPI', 'React', 'Next.js 16', 'Electron', 'PostgreSQL', 'pgvector', 'Microsoft Entra ID', 'Microsoft Graph', 'Gemini', 'Evolution/Meta API', 'MCP (TypeScript)', 'Tailwind 4']
    },
    {
      key: 'experience.items.exp2',
      id: 2,
      company: 'Anbima / Selic (Banco Central)',
      position: '',
      badgeLabel: undefined,
      startDate: '2025-04',
      endDate: '2026-04',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Java 17', 'Spring Boot 3.x', 'Angular', 'Oracle', 'Liquibase', 'Docker', 'GitLab CI/CD', 'Prometheus', 'Grafana', 'Micrometer', 'Spring Actuator', 'Blackbox Exporter', 'AlertManager']
    },
    {
      key: 'experience.items.exp3',
      id: 3,
      company: 'Anbima / Selic (Banco Central)',
      position: '',
      badgeLabel: undefined,
      startDate: '2024-04',
      endDate: '2025-04',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['SharePoint', 'JavaScript', 'HTML', 'CSS', 'Power BI', 'DAX', 'PMI', 'Agile', 'MPS.BR', 'CMMI']
    },
    {
      key: 'experience.items.exp4',
      id: 4,
      company: 'Gondim, Albuquerque e Negreiros ADV',
      position: '',
      badgeLabel: undefined,
      startDate: '2019-11',
      endDate: '2024-04',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Python', 'VBA', 'Selenium', 'RPA']
    },
    {
      key: 'experience.items.exp5',
      id: 5,
      company: 'Phillip Morris Internacional',
      position: '',
      badgeLabel: undefined,
      startDate: '2018-10',
      endDate: '2019-10',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' }
      ],
      technologies: ['VBA', 'Excel', 'Salesforce']
    },
    {
      key: 'experience.items.exp6',
      id: 6,
      company: 'Liquigás / Petrobras Distribuidora S.A',
      position: '',
      badgeLabel: undefined,
      startDate: '2017-04',
      endDate: '2018-09',
      current: false,
      location: 'Duque de Caxias, RJ',
      description: '',
      highlights: [
        { title: '', text: '' }
      ],
      technologies: ['SAP', 'Excel']
    }
  ];

  readonly experiences = computed<Experience[]>(() =>
    this.baseExperiences.map((exp) => ({
      ...exp,
      position: this.i18n.translate(`${exp.key}.position`),
      highlights: (exp.highlights ?? []).map((_, idx) => ({
        title: this.i18n.translate(`${exp.key}.highlights.${idx}.title`),
        text: this.i18n.translate(`${exp.key}.highlights.${idx}.text`)
      }))
    }))
  );

  formatDate(date: string): string {
    const [year, month] = date.split('-');
    const lang = this.i18n.language();
    const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = lang === 'en' ? monthsEn : monthsPt;
    return `${months[parseInt(month) - 1]} ${year}`;
  }

  ngOnInit() {
    // Component initialization
  }

  ngAfterViewInit() {
    // IntersectionObserver não existe no SSR.
    if (!this.isBrowser) {
      return;
    }
    this.setupScrollAnimations();
  }

  private setupScrollAnimations() {
    const observerOptions = {
      threshold: [0.1, 0.3],
      rootMargin: '0px 0px 100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
          entry.target.classList.add('animate-in');
        }
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          entry.target.classList.add('auto-hover');
        } else {
          entry.target.classList.remove('auto-hover');
        }
      });
    }, observerOptions);

    // Observe experience cards
    const experienceCards = this.experienceContainer?.nativeElement?.querySelectorAll('.experience-card');
    experienceCards?.forEach((card: Element, index: number) => {
      (card as HTMLElement).style.transitionDelay = `${index * 0.1}s`;
      observer.observe(card);
    });
  }
}
