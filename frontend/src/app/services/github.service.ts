import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
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
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Serviço para integração com a API do GitHub via backend autenticado.
 * 
 * IMPORTANTE: Todas as chamadas passam pelo backend que usa o token
 * seguro armazenado em secrets. O frontend NUNCA acessa a API do 
 * GitHub diretamente.
 */
@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly http = inject(HttpClient);

  private readonly BACKEND_API = resolveApiUrl('/api/projects');
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos (igual ao backend)
  private readonly STORAGE_KEY_REPOSITORIES = 'github_repositories_cache_v2';
  private readonly STORAGE_KEY_PROFILE = 'github_profile_cache_v1';
  private readonly LANGUAGE_CACHE_PREFIX = 'github_languages_cache_v2_';

  constructor() {
    this.cleanExpiredCache();
  }

  /**
   * Verifica se o cache está válido.
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Busca os repositórios do usuário via backend autenticado.
   * @param limit Número máximo de repositórios a retornar (0 = todos)
   */
  getRepositories(limit: number = 0): Observable<GitHubRepository[]> {
    const cached = this.loadRepositoriesFromCache();
    if (cached) {
      console.log('📦 Retornando repositórios do cache (backend)');
      return of(this.applyLimit(cached, limit));
    }

    console.log('🔐 Buscando repositórios via backend autenticado...');
    return this.http.get<BackendRepositoryResponse[]>(this.BACKEND_API).pipe(
      map(repos => this.mapBackendRepositories(repos)),
      tap(repos => this.saveRepositoriesToCache(repos)),
      map(repos => this.applyLimit(repos, limit)),
      tap(repos => console.log(`✅ ${repos.length} repositórios carregados via backend`)),
      catchError(error => {
        console.error('Erro ao buscar repositórios via backend:', error);
        return of([]);
      })
    );
  }

  /**
   * Busca as linguagens de um repositório específico via backend.
   */
  getRepositoryLanguages(repoName: string): Observable<LanguageInfo[]> {
    const cached = this.loadLanguagesFromCache(repoName);
    if (cached) {
      console.log(`📦 Retornando linguagens do cache para ${repoName}`);
      return of(cached);
    }

    const url = `${this.BACKEND_API}/${encodeURIComponent(repoName)}/languages`;
    console.log(`🔐 Buscando linguagens via backend: ${repoName}`);

    return this.http.get<LanguageShareResponse[]>(url).pipe(
      map(langs => this.mapLanguages(langs)),
      tap(langs => this.saveLanguagesToCache(repoName, langs)),
      catchError(error => {
        console.error(`Erro ao buscar linguagens para ${repoName}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Busca o perfil do usuário no GitHub via backend.
   */
  getUserProfile(): Observable<GithubProfile | null> {
    const cached = this.loadProfileFromCache();
    if (cached) {
      console.log('📦 Retornando perfil do cache');
      return of(cached);
    }

    const url = `${this.BACKEND_API}/profile`;
    console.log('🔐 Buscando perfil via backend autenticado...');

    return this.http.get<GithubProfile>(url).pipe(
      tap(profile => this.saveProfileToCache(profile)),
      tap(profile => console.log(`✅ Perfil carregado: ${profile.login}`)),
      catchError(error => {
        console.error('Erro ao buscar perfil via backend:', error);
        return of(null);
      })
    );
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
      catchError(() => of({ totalStars: 0, totalRepositories: 0, totalForks: 0 }))
    );
  }

  /**
   * Limpa todo o cache.
   */
  clearCache(): void {
    this.removeCache(this.STORAGE_KEY_REPOSITORIES);
    this.removeCache(this.STORAGE_KEY_PROFILE);
    this.removeAllLanguageCaches();
    console.log('🧹 Todo o cache foi limpo');
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
      size: Math.round(repo.totalSizeBytes / 1024)
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

  // ============ Cache de repositórios ============

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

  // ============ Cache de perfil ============

  private loadProfileFromCache(): GithubProfile | null {
    const cached = this.readCache<GithubProfile>(this.STORAGE_KEY_PROFILE);
    if (!cached || !this.isCacheValid(cached.timestamp)) {
      return null;
    }
    return cached.data;
  }

  private saveProfileToCache(profile: GithubProfile): void {
    this.writeCache(this.STORAGE_KEY_PROFILE, profile);
  }

  // ============ Cache de linguagens ============

  private loadLanguagesFromCache(repoName: string): LanguageInfo[] | null {
    const cacheKey = this.languageCacheKey(repoName);
    const cached = this.readCache<LanguageInfo[]>(cacheKey);
    if (!cached || !this.isCacheValid(cached.timestamp)) {
      return null;
    }
    return cached.data;
  }

  private saveLanguagesToCache(repoName: string, langs: LanguageInfo[]): void {
    const cacheKey = this.languageCacheKey(repoName);
    this.writeCache(cacheKey, langs);
  }

  private languageCacheKey(repoName: string): string {
    return `${this.LANGUAGE_CACHE_PREFIX}${repoName.toLowerCase()}`;
  }

  // ============ Utilitários de cache ============

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
    } catch {
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

  private cleanExpiredCache(): void {
    const repositoriesCache = this.readCache<GitHubRepository[]>(this.STORAGE_KEY_REPOSITORIES);
    if (repositoriesCache && !this.isCacheValid(repositoriesCache.timestamp)) {
      this.removeCache(this.STORAGE_KEY_REPOSITORIES);
      console.log('🗑️ Cache de repositórios expirado');
    }

    const profileCache = this.readCache<GithubProfile>(this.STORAGE_KEY_PROFILE);
    if (profileCache && !this.isCacheValid(profileCache.timestamp)) {
      this.removeCache(this.STORAGE_KEY_PROFILE);
      console.log('🗑️ Cache de perfil expirado');
    }

    this.removeExpiredLanguageCaches();
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
      console.log(`🗑️ ${keysToRemove.length} caches de linguagens expirados`);
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

  private hasSessionStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
  }
}
