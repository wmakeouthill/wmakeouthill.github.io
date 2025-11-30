import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, catchError, expand, map, of, reduce, tap } from 'rxjs';
import { GitHubRepository, LanguageInfo } from '../models/interfaces';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Serviço para integração com a API do GitHub
 */
@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly http = inject(HttpClient);

  private readonly GITHUB_API = 'https://api.github.com';
  private readonly username = 'wmakeouthill';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos
  private readonly STORAGE_KEY_REPOSITORIES = 'github_repositories_cache_v1';
  private readonly LANGUAGE_CACHE_PREFIX = 'github_languages_cache_v1_';
  private readonly TOKEN_SESSION_KEY = 'github_pat_token';

  constructor() {
    this.cleanExpiredCache();
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
  getRepositories(limit: number = 0): Observable<GitHubRepository[]> {
    const cached = this.loadRepositoriesFromCache();
    if (cached) {
      console.log('📦 Retornando repositórios do sessionStorage');
      return of(this.applyLimit(cached, limit));
    }

    console.log('🌐 Buscando repositórios diretamente do GitHub...');
    return this.loadAllRepositoriesFromGithub().pipe(
      tap(repos => this.saveRepositoriesToCache(repos)),
      map(repos => this.applyLimit(repos, limit)),
      tap(repos => {
        console.log('💾 Repositórios salvos no cache');
      }),
      catchError(error => {
        console.error('Erro ao buscar repositórios:', error);
        return of([]);
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
    const cached = this.loadLanguagesFromCache(repoName);
    if (cached) {
      console.log(`📦 Retornando linguagens do cache para ${repoName}`);
      return of(cached);
    }

    console.log(`🌐 Buscando linguagens do GitHub para ${repoName}...`);
    const url = `${this.GITHUB_API}/repos/${this.username}/${repoName}/languages`;

    return this.http.get<{ [key: string]: number }>(url, { headers: this.buildHeaders() }).pipe(
      map(languages => this.calculateLanguagePercentages(languages)),
      tap(languages => {
        this.saveLanguagesToCache(repoName, languages);
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
    const repositoriesCache = this.readCache<GitHubRepository[]>(this.STORAGE_KEY_REPOSITORIES);
    if (repositoriesCache && !this.isCacheValid(repositoriesCache.timestamp)) {
      this.removeCache(this.STORAGE_KEY_REPOSITORIES);
      console.log('🗑️ Cache de repositórios expirado e removido');
    }

    this.removeExpiredLanguageCaches();
  }

  /**
   * Força a limpeza de todo o cache
   */
  clearCache(): void {
    this.removeCache(this.STORAGE_KEY_REPOSITORIES);
    this.removeAllLanguageCaches();
    console.log('🧹 Todo o cache foi limpo');
  }

  /**
   * Permite configurar o token pessoal via sessionStorage.
   * Sempre limpe o cache após trocar o token.
   */
  setPersonalToken(token: string): void {
    if (!this.hasSessionStorage()) {
      return;
    }
    sessionStorage.setItem(this.TOKEN_SESSION_KEY, token.trim());
    this.clearCache();
  }

  /**
   * Remove o token salvo na sessão.
   */
  removePersonalToken(): void {
    if (!this.hasSessionStorage()) {
      return;
    }
    sessionStorage.removeItem(this.TOKEN_SESSION_KEY);
    this.clearCache();
  }

  /**
   * Busca informações do perfil do usuário do GitHub
   * @returns Observable com dados do perfil
   */
  getUserProfile(): Observable<any> {
    const url = `${this.GITHUB_API}/users/${this.username}`;

    return this.http.get(url, { headers: this.buildHeaders() }).pipe(
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

    return this.http.get<GitHubRepository>(url, { headers: this.buildHeaders() }).pipe(
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

  private loadAllRepositoriesFromGithub(perPage: number = 100): Observable<GitHubRepository[]> {
    let currentPage = 1;

    return this.fetchRepositoriesPage(currentPage, perPage).pipe(
      expand(repos => {
        if (repos.length === perPage) {
          currentPage += 1;
          return this.fetchRepositoriesPage(currentPage, perPage);
        }
        return EMPTY;
      }),
      reduce((acc, repos) => acc.concat(repos), [] as GitHubRepository[]),
      map(repos => repos.filter(repo => !repo.fork)),
      map(repos => this.enrichRepositoriesWithLanguages(repos))
    );
  }

  private fetchRepositoriesPage(page: number, perPage: number): Observable<GitHubRepository[]> {
    const params = new HttpParams()
      .set('per_page', perPage)
      .set('page', page)
      .set('sort', 'updated');

    return this.http.get<GitHubRepository[]>(
      `${this.GITHUB_API}/users/${this.username}/repos`,
      {
        headers: this.buildHeaders(),
        params
      }
    );
  }

  private applyLimit(repos: GitHubRepository[], limit?: number): GitHubRepository[] {
    if (!limit || limit <= 0) {
      return repos;
    }
    return repos.slice(0, limit);
  }

  private loadRepositoriesFromCache(): GitHubRepository[] | null {
    const cached = this.readCache<GitHubRepository[]>(this.STORAGE_KEY_REPOSITORIES);
    if (!cached || !this.isCacheValid(cached.timestamp)) {
      return null;
    }
    return cached.data;
  }

  private saveRepositoriesToCache(repos: GitHubRepository[]): void {
    this.writeCache(this.STORAGE_KEY_REPOSITORIES, repos);
  }

  private loadLanguagesFromCache(repoName: string): LanguageInfo[] | null {
    const cacheKey = this.languageCacheKey(repoName);
    const cached = this.readCache<LanguageInfo[]>(cacheKey);
    if (!cached || !this.isCacheValid(cached.timestamp)) {
      return null;
    }
    return cached.data;
  }

  private saveLanguagesToCache(repoName: string, languages: LanguageInfo[]): void {
    const cacheKey = this.languageCacheKey(repoName);
    this.writeCache(cacheKey, languages);
  }

  private languageCacheKey(repoName: string): string {
    return `${this.LANGUAGE_CACHE_PREFIX}${repoName.toLowerCase()}`;
  }

  private readCache<T>(key: string): CacheEntry<T> | null {
    if (!this.hasSessionStorage()) {
      return null;
    }
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CacheEntry<T>;
    } catch (error) {
      console.warn(`Erro ao ler cache ${key}:`, error);
      sessionStorage.removeItem(key);
      return null;
    }
  }

  private writeCache<T>(key: string, data: T): void {
    if (!this.hasSessionStorage()) {
      return;
    }
    const payload: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  }

  private removeCache(key: string): void {
    if (!this.hasSessionStorage()) {
      return;
    }
    sessionStorage.removeItem(key);
  }

  private removeExpiredLanguageCaches(): void {
    if (!this.hasSessionStorage()) {
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(this.LANGUAGE_CACHE_PREFIX)) {
        continue;
      }
      const cached = this.readCache<LanguageInfo[]>(key);
      if (!cached || !this.isCacheValid(cached.timestamp)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`🗑️ Cache de linguagens expirado para ${keysToRemove.length} entradas`);
    }
  }

  private removeAllLanguageCaches(): void {
    if (!this.hasSessionStorage()) {
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(this.LANGUAGE_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }

  private buildHeaders(): HttpHeaders {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const token = this.resolvePersonalToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  private resolvePersonalToken(): string | null {
    const sessionToken = this.readTokenFromSession();
    if (sessionToken) {
      return sessionToken;
    }

    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    const envToken = env?.['NG_APP_GITHUB_TOKEN'] ?? env?.['GITHUB_TOKEN'] ?? '';
    return envToken.trim().length > 0 ? envToken.trim() : null;
  }

  private readTokenFromSession(): string | null {
    if (!this.hasSessionStorage()) {
      return null;
    }
    const stored = sessionStorage.getItem(this.TOKEN_SESSION_KEY);
    if (!stored) {
      return null;
    }
    const trimmed = stored.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private hasSessionStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
  }
}
