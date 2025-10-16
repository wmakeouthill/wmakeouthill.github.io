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
        this.loading = false;
      },
      error: (error: any) => {
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

  async openReadmeModal(projectName: string) {
    this.loadingPreRender = true;
    this.currentProjectName = projectName;

    try {
      // Pré-renderizar diagramas Mermaid antes de abrir o modal
      console.log(`🚀 Iniciando pré-renderização para ${projectName}...`);

      // Forçar limpeza de cache e pré-renderização
      await this.markdownService.preRenderMermaidDiagrams(projectName);

      console.log(`✅ Pré-renderização concluída para ${projectName}`);

      // Verificar status do cache
      this.markdownService.getCacheStatus(projectName);

      // Verificar se o conteúdo está realmente pronto no cache
      console.log(`🔍 Verificando se conteúdo está pronto no cache...`);
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        console.log(`⏳ Tentativa ${attempts}/${maxAttempts} de verificação do cache...`);

        // Aguardar um pouco
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verificar se o conteúdo está no cache
        const content = await this.markdownService.forceUpdateReadmeContent(projectName).toPromise();

        if (content) {
          // Verificar se há diagramas ainda carregando
          const loadingCount = (content.match(/class="mermaid-loading"/g) || []).length;
          const renderedCount = (content.match(/class="mermaid-content"/g) || []).length;

          console.log(`📊 Status do conteúdo:`);
          console.log(`  - Diagramas renderizados: ${renderedCount}`);
          console.log(`  - Diagramas carregando: ${loadingCount}`);

          if (loadingCount === 0 && renderedCount > 0) {
            console.log(`✅ Conteúdo totalmente pronto!`);
            isReady = true;
          } else {
            console.log(`⏳ Conteúdo ainda não está totalmente pronto, aguardando...`);
          }
        } else {
          console.log(`⚠️ Conteúdo não encontrado no cache, aguardando...`);
        }
      }

      if (!isReady) {
        console.warn(`⚠️ Timeout na verificação do cache após ${maxAttempts} tentativas`);
      }

      console.log(`🎯 Pronto para abrir modal de ${projectName}`);

    } catch (error) {
      console.error(`❌ Erro na pré-renderização para ${projectName}:`, error);
      // Mesmo com erro, abrir o modal (fallback)
    } finally {
      this.loadingPreRender = false;

      // Abrir modal invisível primeiro para indexação
      console.log(`👻 Abrindo modal invisível para indexação...`);
      this.showReadmeModal = true;
      this.modalVisible = false;

      // Aguardar um pouco para o modal estar no DOM
      setTimeout(async () => {
        console.log(`🔧 Indexando diagramas no modal invisível...`);
        await this.markdownService.indexMermaidDiagramsInModal();

        // Aguardar um pouco mais para garantir que a indexação foi processada
        await new Promise(resolve => setTimeout(resolve, 300));

        // Tornar modal visível (sem fechar)
        console.log(`👁️ Tornando modal visível...`);
        this.modalVisible = true;
        console.log(`📱 Modal totalmente pronto para ${projectName}`);
      }, 500);
    }
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
