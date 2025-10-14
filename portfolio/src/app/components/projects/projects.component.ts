import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GithubService } from '../../services/github.service';
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

  constructor(private githubService: GithubService) {}

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
        .filter(lang => lang !== null) as string[]
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
}
