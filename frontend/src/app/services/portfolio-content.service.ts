import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { resolveApiUrl } from '../utils/api-url.util';

/**
 * DTO para arquivos do repositório GitHub
 */
export interface RepositoryFile {
  fileName: string;
  displayName: string;
  path: string;
  downloadUrl: string;
  htmlUrl: string;
  size: number;
  sha: string;
  type: string;
}

/**
 * Service para acessar conteúdo do portfólio (imagens e documentações)
 * servido pelo backend a partir do repositório GitHub.
 */
@Injectable({
  providedIn: 'root'
})
export class PortfolioContentService {
  private readonly http = inject(HttpClient);

  /** Cache de imagens disponíveis */
  readonly imagens = signal<RepositoryFile[]>([]);
  
  /** Loading state */
  readonly loading = signal(false);

  /** Mapa de nome do projeto -> URL da imagem (cache local) */
  private readonly imageUrlCache = new Map<string, string>();

  /**
   * Carrega lista de imagens disponíveis do backend.
   */
  loadImagens(): Observable<RepositoryFile[]> {
    if (this.imagens().length > 0) {
      return of(this.imagens());
    }

    this.loading.set(true);
    const url = resolveApiUrl('/api/content/images');

    return this.http.get<RepositoryFile[]>(url).pipe(
      tap(imagens => {
        this.imagens.set(imagens);
        this.buildImageCache(imagens);
        this.loading.set(false);
        console.log(`✅ ${imagens.length} imagens de projetos carregadas`);
      }),
      catchError(error => {
        console.error('Erro ao carregar imagens:', error);
        this.loading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Retorna a URL da imagem para um projeto específico.
   * Busca por nome exato ou similar (case-insensitive).
   */
  getProjectImageUrl(projectName: string): string {
    // Verifica cache primeiro
    const cached = this.imageUrlCache.get(projectName.toLowerCase());
    if (cached) {
      return cached;
    }

    // Se não tem cache, retorna URL direta (o backend faz o match)
    return resolveApiUrl(`/api/content/images/${encodeURIComponent(projectName)}.png`);
  }

  /**
   * Verifica se existe imagem para um projeto.
   */
  hasImageForProject(projectName: string): boolean {
    return this.imageUrlCache.has(projectName.toLowerCase());
  }

  /**
   * Constrói cache de URLs de imagens por nome de projeto.
   * Mapeia múltiplas variações do nome para a mesma URL.
   */
  private buildImageCache(imagens: RepositoryFile[]): void {
    this.imageUrlCache.clear();
    
    for (const img of imagens) {
      const url = resolveApiUrl(`/api/content/images/${encodeURIComponent(img.fileName)}`);
      const baseName = img.displayName.toLowerCase();
      
      // Mapeia várias variações do nome
      const variations = this.generateNameVariations(baseName);
      for (const variation of variations) {
        this.imageUrlCache.set(variation, url);
      }
    }
    
    console.log(`📦 Cache de imagens construído com ${this.imageUrlCache.size} entradas`);
  }

  /**
   * Gera variações de um nome para matching flexível.
   */
  private generateNameVariations(name: string): string[] {
    const lower = name.toLowerCase();
    return [
      lower,
      lower.replace(/-/g, '_'),           // kebab -> snake
      lower.replace(/_/g, '-'),           // snake -> kebab
      lower.replace(/[-_]/g, ''),         // sem separadores
      lower.replace(/[-_]/g, ' '),        // com espaços
      lower.replace(/\s+/g, '-'),         // espaços -> kebab
      lower.replace(/\s+/g, '_'),         // espaços -> snake
    ];
  }

  /**
   * Busca a melhor URL de imagem para um projeto.
   * Tenta várias variações do nome.
   */
  findBestImageUrl(projectName: string): string | null {
    // Gera variações do nome do projeto
    const variations = this.generateNameVariations(projectName);

    for (const variation of variations) {
      const url = this.imageUrlCache.get(variation);
      if (url) {
        return url;
      }
    }

    return null;
  }

  /**
   * Placeholder URL para projetos sem imagem.
   */
  getPlaceholderUrl(projectName: string): string {
    return `https://placehold.co/600x400/002E59/DBC27D?text=${encodeURIComponent(projectName)}`;
  }
}

