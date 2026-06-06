import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, viewChild, ElementRef, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { GithubService } from '../../services/github.service';
import { MarkdownService } from '../../services/markdown.service';
import { PortfolioContentService } from '../../services/portfolio-content.service';
import { resolveApiUrl } from '../../utils/api-url.util';
import { GitHubRepository } from '../../models/interfaces';
import { ReadmeModalComponent } from '../readme-modal/readme-modal.component';
import { CodePreviewModalComponent } from '../code-preview-modal/code-preview-modal.component';
import { DemoModalComponent } from '../demo-modal/demo-modal.component';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReadmeModalComponent, CodePreviewModalComponent, DemoModalComponent, TranslatePipe],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  private readonly githubService = inject(GithubService);
  private readonly markdownService = inject(MarkdownService);
  private readonly portfolioContentService = inject(PortfolioContentService);
  private readonly i18nService = inject(I18nService);
  private readonly http = inject(HttpClient);

  readonly projectsSection = viewChild<ElementRef<HTMLElement>>('projectsSection');
  readonly projGrid = viewChild<ElementRef<HTMLElement>>('projGrid');

  // Estado com signals
  readonly projects = signal<GitHubRepository[]>([]);
  readonly loading = signal<boolean>(true);
  readonly refreshing = signal<boolean>(false);
  readonly selectedFilter = signal<string>('all');
  readonly currentPage = signal<number>(1);

  /** Projetos que possuem mídia na galeria (preenchido por probe em background). */
  readonly galleryProjects = signal<Set<string>>(new Set());
  /** Projetos que possuem README/markdown disponível (preenchido após o preload). */
  readonly readmeProjects = signal<Set<string>>(new Set());

  /** Nº de colunas renderizadas no grid (medido), para paginação por linhas cheias. */
  private readonly gridColumns = signal<number>(3);
  /** Quantas linhas completas exibir por página. */
  private readonly rowsPerPage = 2;
  /** Itens por página = colunas medidas × linhas, para sempre preencher linhas inteiras. */
  readonly itemsPerPage = computed(() => Math.max(1, this.gridColumns()) * this.rowsPerPage);

  // README Modal state
  readonly showReadmeModal = signal<boolean>(false);
  readonly currentProjectName = signal<string>('');

  // Code Preview Modal state
  readonly showCodePreviewModal = signal<boolean>(false);
  readonly currentProjectForPreview = signal<string>('');

  // Demo Modal state
  readonly showDemoModal = signal<boolean>(false);
  readonly currentProjectForDemo = signal<string>('');
  readonly currentDemoUrl = signal<string>('');
  readonly currentDemoInitialView = signal<'choice' | 'site' | 'gallery'>('choice');

  private lastLanguage = this.i18nService.language();
  private initialized = false;
  private gridResizeObserver?: ResizeObserver;
  /** URLs de imagens já aquecidas no cache do navegador (evita refazer o preload). */
  private readonly preloadedImages = new Set<string>();

  // Recarrega quando o idioma mudar, respeitando caches por idioma do backend
  private readonly reloadOnLangChange = effect(() => {
    const lang = this.i18nService.language();
    if (!this.initialized) {
      return;
    }
    if (lang !== this.lastLanguage) {
      this.lastLanguage = lang;
      this.loadProjects();
    }
  });

  // Mede quantas colunas o grid renderiza e mantém a paginação em linhas cheias.
  private readonly measureGridColumns = effect((onCleanup) => {
    const gridRef = this.projGrid();
    this.gridResizeObserver?.disconnect();
    if (!gridRef?.nativeElement) {
      return;
    }
    const el = gridRef.nativeElement;
    const update = () => {
      const template = getComputedStyle(el).gridTemplateColumns;
      const cols = template.split(' ').filter(t => t && t !== 'none').length;
      if (cols > 0) {
        this.gridColumns.set(cols);
      }
    };
    update();
    this.gridResizeObserver = new ResizeObserver(update);
    this.gridResizeObserver.observe(el);
    onCleanup(() => this.gridResizeObserver?.disconnect());
  });

  // Garante que a página atual continua válida quando itens-por-página muda.
  private readonly clampCurrentPage = effect(() => {
    const total = this.totalPages();
    if (untracked(() => this.currentPage()) > total) {
      this.currentPage.set(Math.max(1, total));
    }
  });

  ngOnInit(): void {
    // Carrega imagens PRIMEIRO para evitar flash de placeholders
    this.loadProjectImages().then(() => {
      this.loadProjects();
      this.initialized = true;
    });
  }

  /**
   * Carrega imagens de projetos do repositório GitHub via backend.
   * Retorna Promise para garantir que imagens estejam prontas antes de projetos.
   */
  private async loadProjectImages(): Promise<void> {
    return new Promise((resolve) => {
      this.portfolioContentService.loadImagens().subscribe({
        next: () => resolve(),
        error: () => resolve() // Continua mesmo com erro (usa cache/placeholder)
      });
    });
  }

  private loadProjects(): void {
    this.loading.set(true);
    this.githubService.getRepositories().subscribe({
      next: (repos: GitHubRepository[]) => {
        this.projects.set(repos);
        this.loadLanguagesForProjects();
        this.loading.set(false);

        // 🖼️ Pré-carrega TODAS as imagens (não só a página atual) para que a
        // troca de página seja instantânea, sem reload visível.
        this.preloadProjectImages(repos);

        // 🚀 Pré-carrega READMEs de todos os projetos em background
        this.preloadAllReadmesInBackground(repos);

        // 🖼️ Descobre quais projetos têm galeria (para mostrar o botão só nesses)
        this.probeGalleries(repos);
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
      this.markdownService.preloadProjectsInBackground(projectNames)
        .then(() => this.refreshReadmeAvailability(repos))
        .catch(error => {
          console.error('Erro no pré-carregamento de READMEs:', error);
          // Mesmo com erro parcial, atualiza com o que estiver em cache
          this.refreshReadmeAvailability(repos);
        });
    }, 500); // Pequeno delay para não competir com carregamento inicial
  }

  /** Marca quais projetos têm README disponível (conteúdo não-vazio em cache). */
  private refreshReadmeAvailability(repos: GitHubRepository[]): void {
    const available = new Set<string>();
    for (const repo of repos) {
      if (this.markdownService.getReadmeContentSync(repo.name)) {
        available.add(repo.name);
      }
    }
    this.readmeProjects.set(available);
  }

  /**
   * Aquece o cache do navegador com as imagens de todos os projetos (não apenas
   * os da página atual). Leve e em baixa prioridade: usa `new Image()` com
   * `fetchPriority`/`decoding` para não competir com o carregamento inicial.
   */
  private preloadProjectImages(repos: GitHubRepository[]): void {
    for (const repo of repos) {
      const url = this.getProjectImage(repo.name);
      if (!url || this.preloadedImages.has(url) || url.includes('placehold.co')) {
        continue;
      }
      this.preloadedImages.add(url);
      const img = new Image();
      img.decoding = 'async';
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
      img.src = url;
    }
  }

  /** Probe em background: marca projetos que possuem mídia na galeria. */
  private probeGalleries(repos: GitHubRepository[]): void {
    for (const repo of repos) {
      const url = resolveApiUrl(`/api/content/gallery/${encodeURIComponent(repo.name.toLowerCase())}`);
      this.http.get<unknown[]>(url).subscribe({
        next: (files) => {
          if (Array.isArray(files) && files.length > 0) {
            this.galleryProjects.update(set => new Set(set).add(repo.name));
          }
        },
        error: () => { /* sem galeria — botão permanece oculto */ }
      });
    }
  }

  /** Projeto tem galeria com mídia? */
  hasGallery(projectName: string): boolean {
    return this.galleryProjects().has(projectName);
  }

  /** Projeto tem README/markdown disponível? */
  hasReadme(projectName: string): boolean {
    return this.readmeProjects().has(projectName);
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

  // Contagem de projetos com demo
  readonly demoCount = computed(() =>
    this.projects().filter(p => !!p.homepage).length
  );

  // Computed para projetos filtrados
  readonly filteredProjects = computed(() => {
    const filter = this.selectedFilter();
    const allProjects = this.projects();

    if (filter === 'all') return allProjects;
    if (filter === 'demo') return allProjects.filter(p => !!p.homepage);

    return allProjects.filter(p =>
      p.language?.toLowerCase() === filter.toLowerCase()
    );
  });

  // Computed para projetos paginados
  readonly paginatedProjects = computed(() => {
    const perPage = this.itemsPerPage();
    const startIndex = (this.currentPage() - 1) * perPage;
    const endIndex = startIndex + perPage;
    return this.filteredProjects().slice(startIndex, endIndex);
  });

  // Computed para total de páginas
  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredProjects().length / this.itemsPerPage());
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

  /** URL real (rastreável pelo bot) da página de detalhe do projeto, por idioma. */
  projectHref(projectName: string): string {
    const slug = projectName.toLowerCase();
    return this.i18nService.language() === 'en' ? `/en/projects/${slug}` : `/projects/${slug}`;
  }

  closeReadmeModal(): void {
    this.showReadmeModal.set(false);
    this.currentProjectName.set('');
    console.log('📱 Modal fechado - cache mantido');
  }

  openCodePreviewModal(project: GitHubRepository): void {
    console.log(`💻 Abrindo Code Preview para: ${project.name}`);
    this.currentProjectForPreview.set(project.name);
    this.showCodePreviewModal.set(true);
  }

  closeCodePreviewModal(): void {
    this.showCodePreviewModal.set(false);
    this.currentProjectForPreview.set('');
    console.log('💻 Code Preview fechado');
  }

  openDemoModal(project: GitHubRepository): void {
    this.currentProjectForDemo.set(project.name);
    this.currentDemoUrl.set(project.homepage ?? '');
    this.currentDemoInitialView.set('site');
    this.showDemoModal.set(true);
  }

  openProjectGallery(project: GitHubRepository): void {
    this.currentProjectForDemo.set(project.name);
    this.currentDemoUrl.set(project.homepage ?? '');
    this.currentDemoInitialView.set('gallery');
    this.showDemoModal.set(true);
  }

  closeDemoModal(): void {
    this.showDemoModal.set(false);
    this.currentProjectForDemo.set('');
    this.currentDemoUrl.set('');
    this.currentDemoInitialView.set('choice');
  }

  /**
   * Força atualização dos dados de projetos:
   * 1. Invalida cache do backend (para que ele vá ao GitHub)
   * 2. Limpa cache do frontend (sessionStorage)
   * 3. Re-busca os dados frescos
   */
  refresh(): void {
    if (this.refreshing() || this.loading()) return;
    this.refreshing.set(true);

    // Passo 1: invalida cache do backend → ele vai buscar do GitHub na próxima chamada
    this.githubService.invalidateBackendCache().subscribe(() => {
      // Passo 2: limpa cache do frontend (sessionStorage)
      this.githubService.clearCache();

      // Passo 3: re-busca dados frescos
      this.loading.set(true);
      this.githubService.getRepositories().subscribe({
        next: (repos: GitHubRepository[]) => {
          this.projects.set(repos);
          this.loadLanguagesForProjects();
          this.loading.set(false);
          this.refreshing.set(false);
          this.preloadProjectImages(repos);
          this.preloadAllReadmesInBackground(repos);
        },
        error: (error: any) => {
          console.error('Erro ao atualizar projetos:', error);
          this.loading.set(false);
          this.refreshing.set(false);
        }
      });
    });
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

  projectNumber(indexOnPage: number): string {
    const absoluteIndex = (this.currentPage() - 1) * this.itemsPerPage() + indexOnPage + 1;
    return absoluteIndex.toString().padStart(2, '0');
  }

  /**
   * Tratamento de erro quando imagem não carrega.
   * Tenta recarregar ou usa placeholder como fallback.
   */
  onImageError(event: Event, projectName: string): void {
    const img = event.target as HTMLImageElement;
    const currentSrc = img.src;

    // Evita loop infinito - só muda se não for placeholder
    if (currentSrc.includes('placehold.co')) {
      return;
    }

    // Se cache não está pronto, tenta recarregar imagens
    if (!this.portfolioContentService.isCacheReady()) {
      console.log(`🔄 Recarregando imagens devido erro em: ${projectName}`);
      this.portfolioContentService.forceReload().subscribe({
        next: () => {
          // Tenta nova URL do cache atualizado
          const newUrl = this.portfolioContentService.findBestImageUrl(projectName);
          if (newUrl && newUrl !== currentSrc) {
            img.src = newUrl;
            return;
          }
          img.src = this.portfolioContentService.getPlaceholderUrl(projectName);
        },
        error: () => {
          img.src = this.portfolioContentService.getPlaceholderUrl(projectName);
        }
      });
      return;
    }

    // Cache pronto mas imagem não existe - usa placeholder
    img.src = this.portfolioContentService.getPlaceholderUrl(projectName);
  }
}

