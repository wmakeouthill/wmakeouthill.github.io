import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GithubService } from '../../services/github.service';
import { MarkdownService } from '../../services/markdown.service';
import { PortfolioContentService } from '../../services/portfolio-content.service';
import { GitHubRepository } from '../../models/interfaces';
import { ReadmeModalComponent } from '../readme-modal/readme-modal.component';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  selector: 'app-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReadmeModalComponent, TranslatePipe],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  private readonly githubService = inject(GithubService);
  private readonly markdownService = inject(MarkdownService);
  private readonly portfolioContentService = inject(PortfolioContentService);

  readonly projectsSection = viewChild<ElementRef<HTMLElement>>('projectsSection');

  // Estado com signals
  readonly projects = signal<GitHubRepository[]>([]);
  readonly loading = signal<boolean>(true);
  readonly selectedFilter = signal<string>('all');
  readonly currentPage = signal<number>(1);
  readonly itemsPerPage = 6;

  // Modal state com signals
  readonly showReadmeModal = signal<boolean>(false);
  readonly currentProjectName = signal<string>('');

  ngOnInit(): void {
    this.loadProjects();
    this.loadProjectImages();
  }

  /**
   * Carrega imagens de projetos do repositório GitHub via backend.
   */
  private loadProjectImages(): void {
    this.portfolioContentService.loadImagens().subscribe();
  }

  private loadProjects(): void {
    this.loading.set(true);
    this.githubService.getRepositories().subscribe({
      next: (repos: GitHubRepository[]) => {
        this.projects.set(repos);
        this.loadLanguagesForProjects();
        this.loading.set(false);

        // 🚀 Pré-carrega READMEs de todos os projetos em background
        this.preloadAllReadmesInBackground(repos);
      },
      error: (error: any) => {
        console.error('Erro ao carregar projetos:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Pré-carrega todos os READMEs em background após carregar projetos.
   * Isso garante que quando o usuário clicar, o modal abre instantaneamente.
   */
  private preloadAllReadmesInBackground(repos: GitHubRepository[]): void {
    // Extrai nomes dos projetos
    const projectNames = repos.map(repo => repo.name);

    // Inicia pré-carregamento em background (não bloqueia UI)
    setTimeout(() => {
      this.markdownService.preloadProjectsInBackground(projectNames).catch(error => {
        console.error('Erro no pré-carregamento de READMEs:', error);
      });
    }, 500); // Pequeno delay para não competir com carregamento inicial
  }

  private loadLanguagesForProjects(): void {
    const currentProjects = this.projects();
    currentProjects.forEach(project => {
      if (project.languages && project.languages.length > 0) {
        return;
      }
      this.githubService.getRepositoryLanguages(project.name).subscribe({
        next: (languages) => {
          // Atualiza o projeto com as linguagens
          this.projects.update(projects =>
            projects.map(p => p.name === project.name ? { ...p, languages } : p)
          );
        },
        error: (error) => {
          console.error(`Erro ao carregar linguagens para ${project.name}:`, error);
        }
      });
    });
  }

  // Computed para projetos filtrados
  readonly filteredProjects = computed(() => {
    const filter = this.selectedFilter();
    const allProjects = this.projects();

    if (filter === 'all') {
      return allProjects;
    }

    return allProjects.filter(p =>
      p.language?.toLowerCase() === filter.toLowerCase()
    );
  });

  // Computed para projetos paginados
  readonly paginatedProjects = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredProjects().slice(startIndex, endIndex);
  });

  // Computed para total de páginas
  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredProjects().length / this.itemsPerPage);
  });

  // Computed para números de página
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(total);
      }
    }

    return pages;
  });

  // Computed para linguagens disponíveis
  readonly availableLanguages = computed(() => {
    const languages = new Set(
      this.projects()
        .map(p => p.language)
        .filter((lang): lang is string => lang !== null)
    );
    return ['all', ...Array.from(languages)];
  });

  filterProjects(filter: string): void {
    this.selectedFilter.set(filter);
    this.currentPage.set(1);
    this.scrollToProjectsSection();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.scrollToProjectsSection();
    }
  }

  private scrollToProjectsSection(): void {
    const section = this.projectsSection();
    if (section?.nativeElement) {
      section.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  openReadmeModal(projectName: string): void {
    console.log(`⚡ Abrindo modal README para: ${projectName}`);
    this.currentProjectName.set(projectName);
    this.showReadmeModal.set(true);
    console.log(`✅ Modal aberto para ${projectName}`);
  }

  closeReadmeModal(): void {
    this.showReadmeModal.set(false);
    this.currentProjectName.set('');
    console.log('📱 Modal fechado - cache mantido');
  }

  /**
   * Retorna a URL da imagem do projeto.
   * Busca primeiro no cache do serviço (que tem o nome correto do arquivo).
   */
  getProjectImage(projectName: string): string {
    // Tenta encontrar a melhor URL no cache (com nome exato do arquivo)
    const cachedUrl = this.portfolioContentService.findBestImageUrl(projectName);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Se não encontrou no cache, usa placeholder direto
    // (evita tentativas desnecessárias de .png/.jpg que vão falhar)
    return this.portfolioContentService.getPlaceholderUrl(projectName);
  }

  /**
   * Tratamento de erro quando imagem não carrega.
   * Usa placeholder como fallback.
   */
  onImageError(event: Event, projectName: string): void {
    const img = event.target as HTMLImageElement;
    const currentSrc = img.src;

    // Evita loop infinito - só muda se não for placeholder
    if (!currentSrc.includes('placehold.co')) {
      img.src = this.portfolioContentService.getPlaceholderUrl(projectName);
    }
  }
}

