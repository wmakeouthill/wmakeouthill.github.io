import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  @ViewChild('experienceContainer') experienceContainer!: ElementRef;
  private readonly baseExperiences: Array<Experience & { key: string }> = [
    {
      key: 'experience.items.exp1',
      id: 1,
      company: 'Anbima / Selic (Banco Central)',
      position: '',
      startDate: '2025-04',
      endDate: null,
      current: true,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Java', 'Spring', 'Spring Boot', 'Angular', 'Oracle', 'Liquibase', 'Docker', 'Prometheus', 'Grafana']
    },
    {
      key: 'experience.items.exp2',
      id: 2,
      company: 'Anbima / Selic (Banco Central)',
      position: '',
      startDate: '2024-04',
      endDate: '2025-04',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Power BI', 'DAX', 'JavaScript', 'SharePoint', 'Notion']
    },
    {
      key: 'experience.items.exp3',
      id: 3,
      company: 'Gondim, Albuquerque e Negreiros ADV',
      position: '',
      startDate: '2019-11',
      endDate: '2024-04',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Python', 'VBA', 'Selenium', 'RPA']
    },
    {
      key: 'experience.items.exp4',
      id: 4,
      company: 'Phillip Morris Internacional',
      position: '',
      startDate: '2018-10',
      endDate: '2019-10',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['VBA', 'Excel', 'Salesforce']
    },
    {
      key: 'experience.items.exp5',
      id: 5,
      company: 'Liquigás / Petrobras Distribuidora S.A',
      position: '',
      startDate: '2017-04',
      endDate: '2018-09',
      current: false,
      location: 'Duque de Caxias, RJ',
      description: '',
      highlights: [
        { title: '', text: '' },
        { title: '', text: '' },
        { title: '', text: '' }
      ],
      technologies: ['Excel', 'SAP']
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

    // Observe experience cards
    const experienceCards = this.experienceContainer?.nativeElement?.querySelectorAll('.experience-card');
    experienceCards?.forEach((card: Element, index: number) => {
      (card as HTMLElement).style.transitionDelay = `${index * 0.2}s`;
      observer.observe(card);
    });
  }
}
