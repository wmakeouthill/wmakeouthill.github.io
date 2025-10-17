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
  modalVisible = false;

  constructor(
    private readonly githubService: GithubService,
    private readonly markdownService: MarkdownService
  ) { }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.githubService.getRepositories(12).subscribe({
      next: (repos: GitHubRepository[]) => {
        this.projects = repos;
        this.loadLanguagesForProjects();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar projetos:', error);
        this.loading = false;
      }
    });
  }

  loadLanguagesForProjects() {
    this.projects.forEach(project => {
      this.githubService.getRepositoryLanguages(project.name).subscribe({
        next: (languages) => {
          project.languages = languages;
        },
        error: (error) => {
          console.error(`Erro ao carregar linguagens para ${project.name}:`, error);
        }
      });
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
        .filter((lang): lang is string => lang !== null)
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

  openReadmeModal(projectName: string) {
    console.log(`⚡ Abrindo modal README para: ${projectName} (instantâneo!)`);
    this.currentProjectName = projectName;

    // Abrir modal imediatamente - conteúdo já está no cache
    this.showReadmeModal = true;
    this.modalVisible = true;

    console.log(`✅ Modal aberto instantaneamente para ${projectName}`);
  }

  closeReadmeModal() {
    this.showReadmeModal = false;
    this.currentProjectName = '';
    this.modalVisible = false;

    // NÃO limpar cache - deve persistir por 24 horas
    console.log('📱 Modal fechado - cache mantido por 24h');
  }

  getProjectImage(projectName: string): string {
    // Mapear nomes de projetos para imagens locais
    const imageMap: { [key: string]: string } = {
      'LoL-Matchmaking-Fazenda': 'assets/portifolio_imgs/LoL-Matchmaking-Fazenda.png',
      'Mercearia-R-V': 'assets/portifolio_imgs/Mercearia-R-V.png',
      'AA_Space': 'assets/portifolio_imgs/AA_Space.png'
    };

    return imageMap[projectName] || `https://placehold.co/600x400/002E59/DBC27D?text=${projectName}`;
  }
}
