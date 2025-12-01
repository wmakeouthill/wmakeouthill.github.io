import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GithubService } from '../../services/github.service';
import { GitHubRepository } from '../../models/interfaces';
import { ReadmeModalComponent } from '../readme-modal/readme-modal.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReadmeModalComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit, AfterViewInit {
  private readonly githubService = inject(GithubService);
  @ViewChild('projectsSection') private projectsSection?: ElementRef<HTMLElement>;

  projects: GitHubRepository[] = [];
  loading = true;
  selectedFilter = 'all';
  currentPage = 1;
  itemsPerPage = 6;

  // Modal properties
  showReadmeModal = false;
  currentProjectName = '';
  loadingPreRender = false;
  modalVisible = false;

  ngOnInit() {
    this.loadProjects();
  }

  ngAfterViewInit() {
    // Garante que a referência está disponível após a view ser inicializada
  }

  loadProjects() {
    this.loading = true;
    this.githubService.getRepositories().subscribe({
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
      // Se já existe no JSON estático, não chama API
      if (project.languages && project.languages.length > 0) {
        return;
      }
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

    return filtered;
  }

  get paginatedProjects(): GitHubRepository[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredProjects.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProjects.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
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
    this.currentPage = 1;
    this.scrollToProjectsSection();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToProjectsSection();
    }
  }

  private scrollToProjectsSection() {
    // Tenta scrollar para a seção de projetos primeiro
    if (this.projectsSection?.nativeElement) {
      this.projectsSection.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      // Fallback: scrolla para o topo da página
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
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
