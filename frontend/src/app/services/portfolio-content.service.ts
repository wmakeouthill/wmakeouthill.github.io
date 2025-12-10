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
 *
 * As imagens são buscadas do repositório certificados-wesley/portifolio_imgs
 * e o matching é feito por nome do projeto (flexível).
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

  /** Lista de nomes de imagens disponíveis (para debug) */
  private availableImageNames: string[] = [];

  /** Flag para saber se o cache já foi montado */
  private cacheReady = false;

  /** Registro para evitar logs repetidos por projeto */
  private loggedMissing = new Set<string>();

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
        console.log(`✅ ${imagens.length} imagens de projetos carregadas do GitHub`);
        console.log('📷 Imagens disponíveis:', this.availableImageNames);
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
    return this.findBestImageUrl(projectName) !== null;
  }

  /**
   * Constrói cache de URLs de imagens por nome de projeto.
   * Mapeia múltiplas variações do nome para a mesma URL.
   */
  private buildImageCache(imagens: RepositoryFile[]): void {
    this.imageUrlCache.clear();
    this.availableImageNames = [];
    this.cacheReady = false;
    this.loggedMissing.clear();

    for (const img of imagens) {
      const url = resolveApiUrl(`/api/content/images/${encodeURIComponent(img.fileName)}`);
      const baseName = img.displayName.toLowerCase();
      this.availableImageNames.push(img.displayName);

      // Mapeia várias variações do nome
      const variations = this.generateNameVariations(baseName);
      for (const variation of variations) {
        if (!this.imageUrlCache.has(variation)) {
          this.imageUrlCache.set(variation, url);
        }
      }
    }

    console.log(`📦 Cache de imagens construído com ${this.imageUrlCache.size} entradas`);
    this.cacheReady = true;
  }

  /**
   * Gera variações de um nome para matching flexível.
   * Inclui normalizações comuns para nomes de projetos GitHub.
   */
  private generateNameVariations(name: string): string[] {
    const lower = name.toLowerCase().trim();
    const variations = new Set<string>();

    // Variação original
    variations.add(lower);

    // Substitui separadores
    variations.add(lower.replace(/-/g, '_'));           // kebab -> snake
    variations.add(lower.replace(/_/g, '-'));           // snake -> kebab
    variations.add(lower.replace(/[-_]/g, ''));         // sem separadores
    variations.add(lower.replace(/[-_]/g, ' '));        // com espaços
    variations.add(lower.replace(/\s+/g, '-'));         // espaços -> kebab
    variations.add(lower.replace(/\s+/g, '_'));         // espaços -> snake
    variations.add(lower.replace(/\s+/g, ''));          // sem espaços

    // Remove caracteres especiais comuns
    const normalized = lower.replace(/[^a-z0-9\-_\s]/g, '');
    variations.add(normalized);
    variations.add(normalized.replace(/[-_\s]/g, ''));

    // Tenta extrair palavras-chave principais (primeiras 2-3 palavras)
    const words = lower.split(/[-_\s]+/).filter(w => w.length > 0);
    if (words.length > 1) {
      variations.add(words.slice(0, 2).join('-'));
      variations.add(words.slice(0, 2).join('_'));
      variations.add(words.slice(0, 2).join(''));
      if (words.length > 2) {
        variations.add(words.slice(0, 3).join('-'));
        variations.add(words.slice(0, 3).join('_'));
        variations.add(words.slice(0, 3).join(''));
      }
    }

    return Array.from(variations);
  }

  /**
   * Busca a melhor URL de imagem para um projeto.
   * Usa matching fuzzy para encontrar correspondências.
   */
  findBestImageUrl(projectName: string): string | null {
    if (!this.cacheReady) {
      // Cache ainda não carregado: evita log repetitivo
      return null;
    }

    // 1. Tenta match exato com variações
    const variations = this.generateNameVariations(projectName);
    for (const variation of variations) {
      const url = this.imageUrlCache.get(variation);
      if (url) {
        return url;
      }
    }

    // 2. Tenta match parcial (substring)
    const projectLower = projectName.toLowerCase();
    for (const [key, url] of this.imageUrlCache.entries()) {
      // Se o nome do projeto contém o nome da imagem ou vice-versa
      if (key.includes(projectLower) || projectLower.includes(key)) {
        console.log(`🔍 Match parcial encontrado: "${projectName}" -> "${key}"`);
        return url;
      }
    }

    // 3. Tenta match por palavras-chave principais
    const projectWords = projectLower.split(/[-_\s.]+/).filter(w => w.length > 2);
    for (const [key, url] of this.imageUrlCache.entries()) {
      const keyWords = key.split(/[-_\s.]+/).filter(w => w.length > 2);
      const commonWords = projectWords.filter(w => keyWords.includes(w));
      if (commonWords.length >= 2 || (commonWords.length === 1 && commonWords[0].length > 5)) {
        console.log(`🔍 Match por palavras-chave: "${projectName}" -> "${key}" (comum: ${commonWords.join(', ')})`);
        return url;
      }
    }

    // Debug: mostra projetos sem imagem
    if (!this.loggedMissing.has(projectLower)) {
      this.loggedMissing.add(projectLower);
      console.debug(`⚠️ Sem imagem para projeto: "${projectName}". Imagens disponíveis: ${this.availableImageNames.join(', ')}`);
    }
    return null;
  }

  /**
   * Placeholder URL para projetos sem imagem.
   */
  getPlaceholderUrl(projectName: string): string {
    return `https://placehold.co/600x400/002E59/DBC27D?text=${encodeURIComponent(projectName)}`;
  }

  /**
   * Lista os nomes das imagens disponíveis (útil para debug).
   */
  getAvailableImageNames(): string[] {
    return [...this.availableImageNames];
  }
}

