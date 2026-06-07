import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal, computed, viewChild, ElementRef, effect, untracked } from '@angular/core';
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
export class ProjectsComponent implements OnInit, OnDestroy {
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
  private readmeUrlPushed = false;
  private readonly handlePopState = () => {
    if (this.showReadmeModal()) {
      this.closeReadmeModal({ updateHistory: false });
    }
  };

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
    if (!this.isBrowser()) {
      return;
    }
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
    if (this.isBrowser()) {
      window.addEventListener('popstate', this.handlePopState);
    }

    // Carrega imagens PRIMEIRO para evitar flash de placeholders
    this.loadProjectImages().then(() => {
      this.loadProjects();
      this.initialized = true;
    });
  }

  ngOnDestroy(): void {
    this.gridResizeObserver?.disconnect();
    if (this.isBrowser()) {
      window.removeEventListener('popstate', this.handlePopState);
    }
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

        // 📄 Marca quais projetos têm README (o backend já informa via hasReadme)
        this.markReadmeAvailability(repos);

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
   * Marca quais projetos têm README. O backend já envia `hasReadme` na listagem,
   * então isso é síncrono e sem requisições. A renderização do markdown só
   * acontece no clique, ao abrir o modal (mantém o TBT inicial baixo).
   */
  private markReadmeAvailability(repos: GitHubRepository[]): void {
    const flagged = repos.filter(repo => repo.hasReadme);
    if (flagged.length > 0) {
      this.readmeProjects.set(new Set(flagged.map(repo => repo.name)));
      return;
    }

    // Fallback p/ backend antigo (sem o campo hasReadme): sonda em idle SEM
    // renderizar, para não acoplar a ordem dos deploys (frontend antes do Oracle).
    if (!this.isBrowser()) {
      return;
    }
    const projectNames = repos.map(repo => repo.name);
    this.runWhenIdle(() => {
      this.markdownService.probeReadmesInBackground(projectNames).finally(() => {
        const available = new Set<string>();
        for (const repo of repos) {
          if (this.markdownService.isReadmeAvailable(repo.name)) {
            available.add(repo.name);
          }
        }
        this.readmeProjects.set(available);
      });
    });
  }

  /**
   * Executa uma tarefa de baixa prioridade quando a thread principal estiver
   * ociosa, com fallback para setTimeout em browsers sem requestIdleCallback.
   */
  private runWhenIdle(task: () => void): void {
    const ric = (globalThis as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    }).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(task, { timeout: 3000 });
    } else {
      setTimeout(task, 1500);
    }
  }

  /** Probe em background: marca projetos que possuem mídia na galeria. */
  private probeGalleries(repos: GitHubRepository[]): void {
    if (!this.isBrowser()) {
      return;
    }
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

  readonly showEmptyProjects = computed(() =>
    this.isBrowser() && !this.loading() && this.filteredProjects().length === 0
  );

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
    this.currentProjectName.set(projectName);
    this.showReadmeModal.set(true);
  }

  /** URL real (rastreável pelo bot) da página de detalhe do projeto, por idioma. */
  projectHref(projectName: string): string {
    const slug = projectName.toLowerCase();
    return this.i18nService.language() === 'en' ? `/en/projects/${slug}` : `/projects/${slug}`;
  }

  openReadmeFromLink(event: MouseEvent, projectName: string): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      return;
    }
    event.preventDefault();
    this.pushReadmeUrl(projectName);
    this.openReadmeModal(projectName);
  }

  private pushReadmeUrl(projectName: string): void {
    if (!this.isBrowser()) {
      return;
    }
    const href = this.projectHref(projectName);
    const target = new URL(href, window.location.origin);
    if (window.location.pathname === target.pathname) {
      return;
    }
    window.history.pushState({ readmeModal: true, projectName }, '', target.pathname);
    this.readmeUrlPushed = true;
  }

  closeReadmeModal(options: { updateHistory?: boolean } = {}): void {
    this.showReadmeModal.set(false);
    this.currentProjectName.set('');
    if (options.updateHistory !== false && this.readmeUrlPushed && this.isBrowser()) {
      this.readmeUrlPushed = false;
      window.history.back();
    } else {
      this.readmeUrlPushed = false;
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  openCodePreviewModal(project: GitHubRepository): void {
    this.currentProjectForPreview.set(project.name);
    this.showCodePreviewModal.set(true);
  }

  closeCodePreviewModal(): void {
    this.showCodePreviewModal.set(false);
    this.currentProjectForPreview.set('');
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

