import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit, AfterViewInit {
  @ViewChild('highlightsContainer') highlightsContainer!: ElementRef;
  personalInfo = {
    name: 'Wesley de Carvalho Augusto Correia',
    title: 'Desenvolvedor Full Stack',
    yearsOfExperience: 6,
    age: 29,
    location: 'Duque de Caxias, RJ, Brasil',
    email: 'wcacorreia1995@gmail.com',
    driverLicense: 'AB',
    available: true,
    bio: [
      'Desde as lan houses da infância, onde comecei a trabalhar, até hoje, minha trajetória é marcada pela paixão por tecnologia e apoio a negócios com soluções de T.I., suporte técnico e automações. Atuei como autônomo, na empresa familiar de T.I. e em indústrias como gás e energia (Petrobras), tabaco (Philip Morris), jurídico e infraestrutura financeira crítica (Banco Central/Anbima/SELIC). Essa diversidade forjou minha versatilidade técnica e visão estratégica. Analítico e solucionador, identifico gargalos e crio automações que geram eficiência mensurável. Adapto-me com facilidade a grandes corporações ou contextos dinâmicos, destacando-me em soluções criativas sob pressão. Mais que executar, entendo contextos, proponho melhorias e entrego valor. Aprendo rápido, valorizo colaboração, gosto de ser útil e ajudar pessoas e busco desafios que unam inovação e impacto no negócio.'
    ]
  };

  highlights = [
    { icon: '💼', title: 'Experiência', value: 'Experiência em TI com suporte, desenvolvimento e Governança. Além de experiências administrativas e de backoffice.' },
    { icon: '🎓', title: 'Formação', value: 'Graduado em Direito. Cursando Pós-graduação em Desenvolvimento FullStack Java, MBA em Gestão de Projetos e cursando Ciências da Computação (em andamento)' },
    { icon: '🚀', title: 'Projetos', value: 'Automação e Modernização de Sistemas e desenvolvimento fullstack de aplicações.' },
    { icon: '✅', title: 'Status', value: 'Disponível para oportunidades!' }
  ];

  softSkills = [
    'Boa Comunicação',
    'Inglês Intermediário',
    'Gestão de conflitos / Trabalho em equipe',
    'Hiperfoco / Proatividade',
    'Inteligência emocional e autocontrole',
    'Autodidata',
    'Adaptado a rotinas Ágil, Scrum'
  ];

  mainStack = [
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
