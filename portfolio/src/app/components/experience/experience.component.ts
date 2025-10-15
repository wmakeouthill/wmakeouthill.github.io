import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Experience } from '../../models/interfaces';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.css'
})
export class ExperienceComponent implements OnInit, AfterViewInit {
  @ViewChild('experienceContainer') experienceContainer!: ElementRef;
  experiences: Experience[] = [
    {
      id: 1,
      company: 'Anbima / Selic (Banco Central)',
      position: 'Estagiário - Backend / FullStack / ScrumTeam',
      startDate: '2025-04',
      endDate: null,
      current: true,
      location: 'Brasília, DF',
      description: '',
      highlights: [
        { title: 'Modernização de infraestrutura financeira / sistema crítico', text: 'migração Selic mainframe (COBOL) para arquitetura Java (Novo-Selic).' },
        { title: 'Observabilidade e monitoramento', text: 'implementação de stack completa (Prometheus, Grafana, Actuator, Micrometer, Blackbox Exporter, Alertmanager), para análise de métricas de performance e healthcheck.' },
        { title: 'Desenvolvimento full stack', text: 'Java (Spring) Backend + Angular Frontend.' },
        { title: 'DevOps e containerização', text: 'Docker, CI/CD, versionamento de branches com GitLab para colaboração e práticas de deployment automatizado.' },
        { title: 'Gestão de dados', text: 'Oracle (Containerizado) Database (SQL), versionamento de schemas com Liquibase / Scripts SQL.' }
      ],
      technologies: ['Java', 'Spring', 'Spring Boot', 'Angular', 'Oracle', 'Liquibase', 'Docker', 'Prometheus', 'Grafana']
    },
    {
      id: 2,
      company: 'Anbima / Selic (Banco Central)',
      position: 'Estagiário - Projetos / Governança',
      startDate: '2024-04',
      endDate: '2025-04',
      current: false,
      location: 'Brasília, DF',
      description: '',
      highlights: [
        { title: 'Gestão de Projetos', text: 'ciclo de desenvolvimento de artefatos, relatórios executivos e controle de iniciativas estratégicas alinhadas ao PDTIC.' },
        { title: 'Business Intelligence', text: 'criação de dashboards Power BI (DAX) interativos para visualização de KPIs e suporte à tomada de decisão executiva.' },
        { title: 'Desenvolvimento web', text: 'webparts customizados SharePoint (JavaScript, HTML, CSS) integrados via SharePoint API para governança corporativa.' },
        { title: 'Soluções para C-level', text: 'expositores de documentos e notícias institucionais para chefia do Banco Central e ANBIMA.' },
        { title: 'Frameworks de gestão', text: 'aplicação prática de PMI, Agile, MPS.BR e CMMI para padronização e melhoria contínua de procedimentos e processos.' },
        { title: 'Gestão do conhecimento', text: 'elaboração de conteúdos estratégicos e soluções low-code/no-code (Notion), para continuidade do negócio.' }
      ],
      technologies: ['Power BI', 'DAX', 'JavaScript', 'SharePoint', 'Notion']
    },
    {
      id: 3,
      company: 'Gondim, Albuquerque e Negreiros ADV',
      position: 'Estagiário & Assistente Jurídico',
      startDate: '2019-11',
      endDate: '2024-04',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: 'Diligências processuais e financeiras', text: 'protocolos, questionamentos forenses, pagamentos de custas e depósitos judiciais, controle de pagamentos entre cliente-escritório e obrigações processuais.' },
        { title: 'Automação de processos', text: 'desenvolvimento em Python, VBA e Selenium para web scraping de dados de diversos tribunais do Brasil + RPA: integração automatizada entre sistema interno e plataformas judiciais.' },
        { title: 'Otimização operacional', text: 'reduziu tempo de cadastro processual via scripts, melhorando fluxo de dados e produtividade.' },
        { title: 'Análise de dados jurídicos', text: 'resumos de petições e gestão de informações processuais em sistemas internos.' }
      ],
      technologies: ['Python', 'VBA', 'Selenium', 'RPA']
    },
    {
      id: 4,
      company: 'Phillip Morris Internacional',
      position: 'Aprendiz - Analytics / SalesForce',
      startDate: '2018-10',
      endDate: '2019-10',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: 'Automação VBA/Excel', text: 'automações VBA/Excel para coleta automatizada de dados, geração de relatórios e envio email gerencial.' },
        { title: 'Controle de estoque', text: 'gerenciei controle de estoque e distribuição de materiais promocionais (trade marketing) e de escritório.' },
        { title: 'Análise de vendas', text: 'realizei análises de volume de vendas, KPIs comerciais e otimização de rotinas administrativas via macros.' }
      ],
      technologies: ['VBA', 'Excel', 'Salesforce']
    },
    {
      id: 5,
      company: 'Liquigás / Petrobras Distribuidora S.A',
      position: 'Aprendiz - Auxiliar Administrativo / Produção',
      startDate: '2017-04',
      endDate: '2018-09',
      current: false,
      location: 'Rio de Janeiro, RJ',
      description: '',
      highlights: [
        { title: 'Gestão operacional', text: 'atuei com Excel na gestão operacional. Input e leitura de dados no SAP.' },
        { title: 'Atendimento e apoio', text: 'atendimento a clientes, ao centro de destrocas de botijões e fornecedor de GLP. Apoio na gestão de filas e suporte aos vendedores.' },
        { title: 'Controle de qualidade', text: 'controle de qualidade e fiscalização na produção de botijões.' }
      ],
      technologies: ['Excel', 'SAP']
    }
  ];

  formatDate(date: string): string {
    const [year, month] = date.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
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
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
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
