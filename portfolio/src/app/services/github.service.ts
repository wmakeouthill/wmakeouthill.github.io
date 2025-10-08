import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { GitHubRepository } from '../models/interfaces';

/**
 * Serviço para integração com a API do GitHub
 */
@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly GITHUB_API = 'https://api.github.com';
  private readonly username = 'wmakeouthill'; // Altere para seu usuário do GitHub

  constructor(private http: HttpClient) { }

  /**
   * Busca os repositórios do usuário do GitHub
   * @param limit Número máximo de repositórios a retornar
   * @returns Observable com array de repositórios
   */
  getRepositories(limit: number = 6): Observable<GitHubRepository[]> {
    const url = `${this.GITHUB_API}/users/${this.username}/repos?sort=updated&per_page=${limit}`;
    
    return this.http.get<GitHubRepository[]>(url).pipe(
      map(repos => repos.filter(repo => !repo.fork)), // Filtra forks
      catchError(error => {
        console.error('Erro ao buscar repositórios:', error);
        return of([]); // Retorna array vazio em caso de erro
      })
    );
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
