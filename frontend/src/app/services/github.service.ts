import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { GitHubRepository, LanguageInfo } from '../models/interfaces';
import { resolveApiUrl } from '../utils/api-url.util';

/**
 * Representa o perfil do usuário no GitHub.
 */
export interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
  blog: string | null;
  twitterUsername: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Representa estatísticas do GitHub.
 */
export interface GithubStats {
  totalStars: number;
  totalRepositories: number;
  totalForks: number;
  contributedRepositories: number;
}

/**
 * Representa a resposta de linguagens do backend.
 */
interface LanguageShareResponse {
  name: string;
  percentage: number;
  color: string;
}

/**
 * Representa a resposta de repositório do backend.
 */
interface BackendRepositoryResponse {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
  topics: string[];
  createdAt: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  fork: boolean;
  languages: LanguageShareResponse[];
  totalSizeBytes: number;
  hasReadme: boolean;
}

/**
 * Serviço para integração com a API do GitHub via backend autenticado.
 *
 * IMPORTANTE: Todas as chamadas passam pelo backend que usa o token
 * seguro armazenado em secrets. O frontend NUNCA acessa a API do
 * GitHub diretamente.
 *
 * Cache: este serviço NÃO persiste mais dados em sessionStorage. A
 * frescura dos dados é garantida de ponta a ponta pelo cache HTTP do
 * browser + ETag: o backend responde `Cache-Control: no-cache` com um
 * ETag, então o navegador revalida a cada requisição (If-None-Match) e
 * recebe 304 quando nada mudou — barato e sempre atual para todos.
 *
 * Mantém-se apenas um cache in-memory (shareReplay) para deduplicar
 * chamadas concorrentes/repetidas dentro da mesma carga de página. Ele é
 * keyed por idioma e zerado em {@link clearCache}.
 */
@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly http = inject(HttpClient);

  private readonly BACKEND_API = resolveApiUrl('/api/projects');

  /** Cache in-memory de dedup (não persiste; revalidação fica a cargo do ETag). */
  private readonly repositoriesByLang = new Map<string, Observable<GitHubRepository[]>>();
  private readonly languagesByRepo = new Map<string, Observable<LanguageInfo[]>>();
  private profile$?: Observable<GithubProfile | null>;

  /**
   * Busca os repositórios do usuário via backend autenticado.
   * @param limit Número máximo de repositórios a retornar (0 = todos)
   */
  getRepositories(limit: number = 0): Observable<GitHubRepository[]> {
    const langKey = this.getLanguageCode();
    let request$ = this.repositoriesByLang.get(langKey);

    if (!request$) {
      console.log('🔐 Buscando repositórios via backend autenticado...');
      request$ = this.http.get<BackendRepositoryResponse[]>(this.BACKEND_API).pipe(
        map(repos => this.mapBackendRepositories(repos)),
        tap(repos => console.log(`✅ ${repos.length} repositórios carregados via backend`)),
        catchError(error => {
          console.error('Erro ao buscar repositórios via backend:', error);
          this.repositoriesByLang.delete(langKey); // permite retry na próxima chamada
          return of([] as GitHubRepository[]);
        }),
        shareReplay(1)
      );
      this.repositoriesByLang.set(langKey, request$);
    }

    return request$.pipe(map(repos => this.applyLimit(repos, limit)));
  }

  /**
   * Busca as linguagens de um repositório específico via backend.
   */
  getRepositoryLanguages(repoName: string): Observable<LanguageInfo[]> {
    const key = repoName.toLowerCase();
    let request$ = this.languagesByRepo.get(key);

    if (!request$) {
      const url = `${this.BACKEND_API}/${encodeURIComponent(repoName)}/languages`;
      console.log(`🔐 Buscando linguagens via backend: ${repoName}`);
      request$ = this.http.get<LanguageShareResponse[]>(url).pipe(
        map(langs => this.mapLanguages(langs)),
        catchError(error => {
          console.error(`Erro ao buscar linguagens para ${repoName}:`, error);
          this.languagesByRepo.delete(key);
          return of([] as LanguageInfo[]);
        }),
        shareReplay(1)
      );
      this.languagesByRepo.set(key, request$);
    }

    return request$;
  }

  /**
   * Busca o perfil do usuário no GitHub via backend.
   */
  getUserProfile(): Observable<GithubProfile | null> {
    if (!this.profile$) {
      const url = `${this.BACKEND_API}/profile`;
      console.log('🔐 Buscando perfil via backend autenticado...');
      this.profile$ = this.http.get<GithubProfile>(url).pipe(
        tap(profile => console.log(`✅ Perfil carregado: ${profile.login}`)),
        catchError(error => {
          console.error('Erro ao buscar perfil via backend:', error);
          this.profile$ = undefined;
          return of(null);
        }),
        shareReplay(1)
      );
    }
    return this.profile$;
  }

  /**
   * Busca um repositório específico via backend.
   */
  getRepository(repoName: string): Observable<GitHubRepository | null> {
    return this.getRepositories().pipe(
      map(repos => repos.find(r => r.name.toLowerCase() === repoName.toLowerCase()) || null),
      catchError(error => {
        console.error('Erro ao buscar repositório:', error);
        return of(null);
      })
    );
  }

  /**
   * Retorna o total de stars em todos os repositórios via backend.
   */
  getTotalStars(): Observable<number> {
    const url = `${this.BACKEND_API}/stats`;
    return this.http.get<GithubStats>(url).pipe(
      map(stats => stats.totalStars),
      catchError(() => of(0))
    );
  }

  /**
   * Retorna estatísticas gerais do GitHub.
   */
  getStats(): Observable<GithubStats> {
    const url = `${this.BACKEND_API}/stats`;
    return this.http.get<GithubStats>(url).pipe(
      catchError(() => of({ totalStars: 0, totalRepositories: 0, totalForks: 0, contributedRepositories: 0 }))
    );
  }

  /**
   * Limpa o cache in-memory de dedup, forçando que a próxima chamada faça
   * uma nova requisição HTTP (que ainda assim revalida via ETag no browser).
   */
  clearCache(): void {
    this.repositoriesByLang.clear();
    this.languagesByRepo.clear();
    this.profile$ = undefined;
    console.log('🧹 Cache in-memory do frontend limpo');
  }

  /**
   * Invalida o cache de projetos no backend, forçando busca fresca no GitHub.
   * Retorna Observable que completa quando o backend confirmou a invalidação.
   */
  invalidateBackendCache(): Observable<void> {
    const url = `${this.BACKEND_API}/refresh`;
    return this.http.post<{ status: string }>(url, null).pipe(
      tap(() => console.log('🔄 Cache do backend invalidado — próxima busca vai ao GitHub')),
      map(() => void 0),
      catchError(err => {
        console.warn('⚠️ Falha ao invalidar cache do backend:', err.message);
        return of(void 0);
      })
    );
  }

  /**
   * Retorna a cor associada a uma linguagem.
   */
  getLanguageColor(language: string): string {
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

  // ============ Mapeamento de dados ============

  private mapBackendRepositories(repos: BackendRepositoryResponse[]): GitHubRepository[] {
    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.fullName,
      description: repo.description,
      html_url: repo.htmlUrl,
      homepage: repo.homepage,
      stargazers_count: repo.stargazersCount,
      forks_count: repo.forksCount,
      language: repo.language,
      topics: repo.topics || [],
      created_at: repo.createdAt || '',
      updated_at: repo.updatedAt || '',
      pushed_at: repo.pushedAt || '',
      fork: repo.fork,
      languages: repo.languages?.map(l => ({
        name: l.name,
        percentage: l.percentage,
        color: l.color
      })) || [],
      totalLanguageBytes: repo.totalSizeBytes,
      size: Math.round(repo.totalSizeBytes / 1024),
      hasReadme: repo.hasReadme ?? false
    }));
  }

  private mapLanguages(langs: LanguageShareResponse[]): LanguageInfo[] {
    return langs.map(l => ({
      name: l.name,
      percentage: l.percentage,
      color: l.color
    }));
  }

  private applyLimit(repos: GitHubRepository[], limit?: number): GitHubRepository[] {
    if (!limit || limit <= 0) {
      return repos;
    }
    return repos.slice(0, limit);
  }

  private getLanguageCode(): string {
    try {
      const lang = localStorage.getItem('portfolio-language');
      return lang === 'en' ? 'en' : 'pt';
    } catch {
      return 'pt';
    }
  }
}
