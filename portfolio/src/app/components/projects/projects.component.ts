import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GithubService } from '../../services/github.service';
import { MarkdownService } from '../../services/markdown.service';
import { GitHubRepository } from '../../models/interfaces';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
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
  readmeContent = '';
  loadingReadme = false;
  markdownZoom = 0.9; // Zoom padrão menor

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

  openReadmeModal(projectName: string) {
    this.currentProjectName = projectName;
    this.showReadmeModal = true;
    this.loadingReadme = true;
    this.readmeContent = '';

    this.markdownService.getReadmeContent(projectName).subscribe({
      next: (content) => {
        this.readmeContent = content;
        this.loadingReadme = false;
      },
      error: (error) => {
        console.error('Erro ao carregar README:', error);
        this.loadingReadme = false;
      }
    });
  }

  closeReadmeModal() {
    this.showReadmeModal = false;
    this.currentProjectName = '';
    this.readmeContent = '';
    this.loadingReadme = false;
    this.markdownZoom = 0.9; // Reset zoom quando fecha
  }

  increaseZoom() {
    if (this.markdownZoom < 1.5) {
      this.markdownZoom += 0.1;
    }
  }

  decreaseZoom() {
    if (this.markdownZoom > 0.5) {
      this.markdownZoom -= 0.1;
    }
  }

  resetZoom() {
    this.markdownZoom = 0.9;
  }

  onMouseWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.increaseZoom();
      } else {
        this.decreaseZoom();
      }
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey) {
      switch (event.key) {
        case '=':
        case '+':
          event.preventDefault();
          this.increaseZoom();
          break;
        case '-':
          event.preventDefault();
          this.decreaseZoom();
          break;
        case '0':
          event.preventDefault();
          this.resetZoom();
          break;
      }
    }
  }
}
