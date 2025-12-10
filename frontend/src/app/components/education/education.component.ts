import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Education } from '../../models/interfaces';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-education',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './education.component.html',
  styleUrl: './education.component.css'
})
export class EducationComponent implements OnInit, AfterViewInit {
  private readonly i18n = inject(I18nService);
  @ViewChild('educationContainer') educationContainer!: ElementRef;
  private readonly baseEducation: Array<Education & { key: string }> = [
    {
      key: 'education.items.edu1',
      id: 1,
      institution: 'Faculdade FACINT',
      degree: '',
      field: '',
      startDate: '2025-08',
      endDate: '2026-05',
      current: true,
      description: ''
    },
    {
      key: 'education.items.edu2',
      id: 2,
      institution: 'Centro Universitário Unigama',
      degree: '',
      field: '',
      startDate: '2025-01',
      endDate: '2025-12',
      current: true,
      description: ''
    },
    {
      key: 'education.items.edu3',
      id: 3,
      institution: 'Faculdade GRAN',
      degree: '',
      field: '',
      startDate: '2024-02',
      endDate: '2027-08',
      current: true,
      description: ''
    },
    {
      key: 'education.items.edu4',
      id: 4,
      institution: 'Centro Universitário Unigama',
      degree: '',
      field: '',
      startDate: '2018-02',
      endDate: '2022-12',
      current: false,
      description: ''
    }
  ];

  readonly education = computed<Education[]>(() =>
    this.baseEducation.map((edu) => ({
      ...edu,
      degree: this.i18n.translate(`${edu.key}.degree`),
      field: this.i18n.translate(`${edu.key}.field`),
      description: this.i18n.translate(`${edu.key}.description`)
    }))
  );

  formatDate(date: string): string {
    const [year] = date.split('-');
    return `${year}`;
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

    // Observe education cards
    const educationCards = this.educationContainer?.nativeElement?.querySelectorAll('.education-card');
    educationCards?.forEach((card: Element, index: number) => {
      (card as HTMLElement).style.transitionDelay = `${index * 0.2}s`;
      observer.observe(card);
    });
  }
}
