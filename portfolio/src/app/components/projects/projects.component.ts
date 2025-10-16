import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GithubService } from '../../services/github.service';
import { GitHubRepository } from '../../models/interfaces';
import { MarkdownService } from '../../services/markdown.service';
import { ReadmeModalComponent } from '../readme-modal/readme-modal.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReadmeModalComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  projects: GitHubRepository[] = [];
  loading = true;
  selectedFilter = 'all';
  visibleCount = 6;

  // Modal properties
  showReadmeModal = false;
  currentProjectName = '';
  loadingPreRender = false;

  constructor(
    private readonly githubService: GithubService,
    private readonly markdownService: MarkdownService
  ) { }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.githubService.getRepositories(12).subscribe({
      next: (repos) => {
        this.projects = repos;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar projetos:', error);
        this.loading = false;
      }
    });
  }

  get filteredProjects(): GitHubRepository[] {
    let filtered = this.projects;

    if (this.selectedFilter !== 'all') {
      filtered = this.projects.filter(p =>
        p.language?.toLowerCase() === this.selectedFilter.toLowerCase()
      );
    }

    return filtered.slice(0, this.visibleCount);
  }

  get availableLanguages(): string[] {
    const languages = new Set(
      this.projects
        .map(p => p.language)
        .filter(lang => lang !== null)
    );
    return ['all', ...Array.from(languages)];
  }

  filterProjects(filter: string) {
    this.selectedFilter = filter;
    this.visibleCount = 6;
  }

  loadMore() {
    this.visibleCount += 6;
  }

  get hasMore(): boolean {
    return this.visibleCount < this.filteredProjects.length;
  }

  async openReadmeModal(projectName: string) {
    this.loadingPreRender = true;
    this.currentProjectName = projectName;

    try {
      // Pré-renderizar diagramas Mermaid antes de abrir o modal
      console.log(`Iniciando pré-renderização para ${projectName}...`);

      // Forçar limpeza de cache e pré-renderização
      await this.markdownService.preRenderMermaidDiagrams(projectName);

      console.log(`Pré-renderização concluída para ${projectName}`);

      // Aguardar um pouco mais para garantir que tudo está pronto
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Erro na pré-renderização para ${projectName}:`, error);
    } finally {
      this.loadingPreRender = false;
      // Só abrir o modal depois que tudo estiver pré-renderizado
      this.showReadmeModal = true;
    }
  }

  closeReadmeModal() {
    this.showReadmeModal = false;
    this.currentProjectName = '';
  }

  getProjectImage(projectName: string): string {
    // Mapear nomes de projetos para imagens locais
    const imageMap: { [key: string]: string } = {
      'LoL-Matchmaking-Fazenda': 'assets/portifolio_imgs/LoL-Matchmaking-Fazenda.png',
      'Mercearia-R-V': 'assets/portifolio_imgs/Mercearia-R-V.png'
    };

    return imageMap[projectName] || `https://placehold.co/600x400/002E59/DBC27D?text=${projectName}`;
  }
}
