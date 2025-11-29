import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { GitHubRepository, LanguageInfo } from '../models/interfaces';

/**
 * Serviço para integração com a API do GitHub
 */
@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly http = inject(HttpClient);

  private readonly GITHUB_API = 'https://api.github.com';
  private readonly username = 'wmakeouthill'; // Altere para seu usuário do GitHub
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos

  /**
   * URL do backend que expõe os projetos do GitHub.
   * Em desenvolvimento local, costuma ser http://localhost:8080/api/projects.
   * Em produção, a URL pode ser ajustada para o domínio público do backend.
   */
  private readonly backendProjectsApi = 'http://localhost:8080/api/projects';

  // Cache para repositórios
  private repositoriesCache: { data: GitHubRepository[], timestamp: number } | null = null;
  
  // Cache para linguagens de cada repositório
  private languagesCache = new Map<string, { data: LanguageInfo[], timestamp: number }>();

  constructor() { }

  /**
   * Busca os repositórios a partir do backend Spring Boot.
   * O backend já aplica ordenação e enriquece com linguagens.
   * Retorna TODOS os repositórios (sem limite).
   */
  getRepositoriesFromBackend(): Observable<GitHubRepository[]> {
    return this.http.get<any[]>(this.backendProjectsApi).pipe(
      map(repos => this.mapBackendReposToGitHub(repos)),
      catchError(error => {
        console.error('Erro ao buscar projetos do backend:', error);
        return of([]);
      })
    );
  }

  private mapBackendReposToGitHub(repos: any[]): GitHubRepository[] {
    if (!Array.isArray(repos)) return [];

    return repos.map((r: any): GitHubRepository => ({
      id: r.id,
      name: r.name,
      full_name: r.fullName ?? r.name,
      description: r.description ?? null,
      html_url: r.htmlUrl,
      homepage: r.homepage ?? null,
      stargazers_count: r.stargazersCount ?? 0,
      forks_count: r.forksCount ?? 0,
      language: r.language ?? null,
      topics: Array.isArray(r.topics) ? r.topics : [],
      created_at: r.createdAt ?? '',
      updated_at: r.updatedAt ?? '',
      pushed_at: r.pushedAt ?? '',
      fork: !!r.fork,
      languages: Array.isArray(r.languages) ? r.languages : []
    }));
  }
  /**
   * Lê dados pré-gerados de repositórios a partir de assets/github_data.json
   * Retorna [] se o arquivo não existir ou estiver inválido
   */
  getRepositoriesFromAssets(): Observable<GitHubRepository[]> {
    const path = 'assets/github_data.json';
    return this.http.get<any>(path).pipe(
      map(payload => {
        if (!payload || !Array.isArray(payload.repositories)) return [];
        // Tipagem defensiva: garante formato esperado
        const repos: GitHubRepository[] = payload.repositories.map((r: any) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name ?? r.name,
          description: r.description ?? null,
          html_url: r.html_url,
          homepage: r.homepage ?? null,
          stargazers_count: r.stargazers_count ?? 0,
          forks_count: r.forks_count ?? 0,
          language: r.language ?? null,
          topics: Array.isArray(r.topics) ? r.topics : [],
          created_at: r.created_at ?? '',
          updated_at: r.updated_at ?? '',
          pushed_at: r.pushed_at ?? '',
          fork: !!r.fork,
          languages: Array.isArray(r.languages) ? r.languages : []
        }));
        return repos;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Verifica se o cache está válido
   * @param timestamp Timestamp do cache
   * @returns true se o cache ainda é válido
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Busca os repositórios do usuário do GitHub (com cache)
   * @param limit Número máximo de repositórios a retornar
   * @returns Observable com array de repositórios
   */
  getRepositories(limit: number = 6): Observable<GitHubRepository[]> {
    // Verifica se existe cache válido
    if (this.repositoriesCache && this.isCacheValid(this.repositoriesCache.timestamp)) {
      console.log('📦 Retornando repositórios do cache');
      return of(this.repositoriesCache.data);
    }

    console.log('🌐 Buscando repositórios do GitHub...');
    const url = `${this.GITHUB_API}/users/${this.username}/repos?sort=updated&per_page=${limit}`;
    
    return this.http.get<GitHubRepository[]>(url).pipe(
      map(repos => repos.filter(repo => !repo.fork)), // Filtra forks
      map(repos => this.enrichRepositoriesWithLanguages(repos)),
      tap(repos => {
        // Salva no cache
        this.repositoriesCache = {
          data: repos,
          timestamp: Date.now()
        };
        console.log('💾 Repositórios salvos no cache');
      }),
      catchError(error => {
        console.error('Erro ao buscar repositórios:', error);
        return of([]); // Retorna array vazio em caso de erro
      })
    );
  }

  /**
   * Enriquece os repositórios com informações de linguagens
   * @param repos Array de repositórios
   * @returns Array de repositórios enriquecidos
   */
  private enrichRepositoriesWithLanguages(repos: GitHubRepository[]): GitHubRepository[] {
    return repos.map(repo => ({
      ...repo,
      languages: [] // Será preenchido assincronamente
    }));
  }

  /**
   * Busca as linguagens de um repositório específico (com cache)
   * @param repoName Nome do repositório
   * @returns Observable com array de linguagens e suas porcentagens
   */
  getRepositoryLanguages(repoName: string): Observable<LanguageInfo[]> {
    // Verifica se existe cache válido para este repositório
    const cached = this.languagesCache.get(repoName);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log(`📦 Retornando linguagens do cache para ${repoName}`);
      return of(cached.data);
    }

    console.log(`🌐 Buscando linguagens do GitHub para ${repoName}...`);
    const url = `${this.GITHUB_API}/repos/${this.username}/${repoName}/languages`;
    
    return this.http.get<{ [key: string]: number }>(url).pipe(
      map(languages => this.calculateLanguagePercentages(languages)),
      tap(languages => {
        // Salva no cache
        this.languagesCache.set(repoName, {
          data: languages,
          timestamp: Date.now()
        });
        console.log(`💾 Linguagens salvas no cache para ${repoName}`);
      }),
      catchError(error => {
        console.error(`Erro ao buscar linguagens para ${repoName}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Calcula as porcentagens das linguagens
   * @param languages Objeto com linguagens e bytes
   * @returns Array com linguagens e suas porcentagens
   */
  private calculateLanguagePercentages(languages: { [key: string]: number }): LanguageInfo[] {
    const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);

    return Object.entries(languages)
      .map(([name, bytes]) => ({
        name,
        percentage: Math.round((bytes / totalBytes) * 100),
        color: this.getLanguageColor(name)
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Retorna a cor associada a uma linguagem (similar ao GitHub)
   * @param language Nome da linguagem
   * @returns Cor em hexadecimal
   */
  private getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      'TypeScript': '#3178c6',
      'JavaScript': '#f1e05a',
      'Java': '#b07219',
      'Python': '#3776ab',
      'C#': '#239120',
      'C++': '#00599c',
      'C': '#a8b9cc',
      'Go': '#00add8',
      'Rust': '#dea584',
      'PHP': '#4f5d95',
      'Ruby': '#701516',
      'Swift': '#fa7343',
      'Kotlin': '#7f52ff',
      'Dart': '#00b4ab',
      'HTML': '#e34c26',
      'CSS': '#1572b6',
      'SCSS': '#cf649a',
      'Sass': '#cf649a',
      'Less': '#1d365d',
      'Vue': '#4fc08d',
      'React': '#61dafb',
      'Angular': '#dd0031',
      'Node.js': '#339933',
      'Shell': '#89e051',
      'PowerShell': '#012456',
      'Dockerfile': '#384d54',
      'YAML': '#cb171e',
      'JSON': '#000000',
      'Markdown': '#083fa1',
      'SQL': '#336791',
      'R': '#198ce7',
      'MATLAB': '#e16737',
      'Scala': '#c22d40',
      'Perl': '#39457e',
      'Lua': '#000080',
      'Haskell': '#5d4f85',
      'Clojure': '#5881d8',
      'Elixir': '#6e4a7e',
      'Erlang': '#a90533',
      'F#': '#b845fc',
      'OCaml': '#3be133',
      'D': '#ba595e',
      'Nim': '#ffc200',
      'Crystal': '#000100',
      'Zig': '#f7a41d',
      'Assembly': '#6e4c13',
      'Other': '#6c757d'
    };

    return colors[language] || colors['Other'];
  }

  /**
   * Limpa o cache expirado
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    
    // Limpa cache de repositórios se expirado
    if (this.repositoriesCache && !this.isCacheValid(this.repositoriesCache.timestamp)) {
      this.repositoriesCache = null;
      console.log('🗑️ Cache de repositórios expirado e removido');
    }
    
    // Limpa cache de linguagens expiradas
    for (const [repoName, cache] of this.languagesCache.entries()) {
      if (!this.isCacheValid(cache.timestamp)) {
        this.languagesCache.delete(repoName);
        console.log(`🗑️ Cache de linguagens expirado para ${repoName}`);
      }
    }
  }

  /**
   * Força a limpeza de todo o cache
   */
  clearCache(): void {
    this.repositoriesCache = null;
    this.languagesCache.clear();
    console.log('🧹 Todo o cache foi limpo');
  }

  /**
   * Retorna informações sobre o estado do cache
   */
  getCacheInfo(): { repositories: boolean, languagesCount: number } {
    return {
      repositories: this.repositoriesCache !== null && this.isCacheValid(this.repositoriesCache.timestamp),
      languagesCount: Array.from(this.languagesCache.values()).filter(cache => 
        this.isCacheValid(cache.timestamp)
      ).length
    };
  }

  /**
   * Busca informações do perfil do usuário do GitHub
   * @returns Observable com dados do perfil
   */
  getUserProfile(): Observable<any> {
    const url = `${this.GITHUB_API}/users/${this.username}`;

    return this.http.get(url).pipe(
      catchError(error => {
        console.error('Erro ao buscar perfil:', error);
        return of(null);
      })
    );
  }

  /**
   * Busca um repositório específico
   * @param repoName Nome do repositório
   * @returns Observable com dados do repositório
   */
  getRepository(repoName: string): Observable<GitHubRepository | null> {
    const url = `${this.GITHUB_API}/repos/${this.username}/${repoName}`;

    return this.http.get<GitHubRepository>(url).pipe(
      catchError(error => {
        console.error('Erro ao buscar repositório:', error);
        return of(null);
      })
    );
  }

  /**
   * Retorna o total de stars em todos os repositórios
   * @returns Observable com total de stars
   */
  getTotalStars(): Observable<number> {
    return this.getRepositories(100).pipe(
      map(repos => repos.reduce((total, repo) => total + repo.stargazers_count, 0)),
      catchError(() => of(0))
    );
  }
}
