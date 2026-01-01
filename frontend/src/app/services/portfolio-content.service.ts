import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, retry, timer, throwError } from 'rxjs';
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

/** Chave para persistir cache no localStorage */
const CACHE_KEY = 'portfolio_images_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

interface CachedImages {
  images: RepositoryFile[];
  timestamp: number;
}

/**
 * Service para acessar conteúdo do portfólio (imagens e documentações)
 * servido pelo backend a partir do repositório GitHub.
 *
 * Usa localStorage para persistir cache entre recarregamentos de página.
 * Inclui retry automático em caso de falha de rede.
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

  /** Erro de carregamento */
  readonly error = signal<string | null>(null);

  /** Mapa de nome do projeto -> URL da imagem (cache local) */
  private readonly imageUrlCache = new Map<string, string>();

  /** Lista de nomes de imagens disponíveis (para debug) */
  private availableImageNames: string[] = [];

  /** Flag para saber se o cache já foi montado */
  private cacheReady = false;

  /** Registro para evitar logs repetidos por projeto */
  private loggedMissing = new Set<string>();

  /** Flag para indicar se carregamento está em andamento */
  private loadingInProgress = false;

  constructor() {
    // Carrega do localStorage na inicialização
    this.loadFromLocalStorage();
  }

  /**
   * Tenta carregar cache do localStorage.
   */
  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedImages = JSON.parse(cached);
        const age = Date.now() - data.timestamp;

        if (age < CACHE_TTL_MS && data.images?.length > 0) {
          console.log(`📦 Carregando ${data.images.length} imagens do localStorage (age: ${Math.round(age / 1000)}s)`);
          this.imagens.set(data.images);
          this.buildImageCache(data.images);
        } else {
          console.log('🗑️ Cache do localStorage expirado ou vazio, limpando...');
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar cache do localStorage:', e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  /**
   * Persiste cache no localStorage.
   */
  private saveToLocalStorage(images: RepositoryFile[]): void {
    try {
      const data: CachedImages = {
        images,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      console.log(`💾 Cache de ${images.length} imagens salvo no localStorage`);
    } catch (e) {
      console.warn('Erro ao salvar cache no localStorage:', e);
    }
  }

  /**
   * Carrega lista de imagens disponíveis do backend.
   * Com retry automático e persistência em localStorage.
   */
  loadImagens(): Observable<RepositoryFile[]> {
    // Se já tem imagens em memória e não está carregando, retorna
    if (this.imagens().length > 0 && !this.loadingInProgress) {
      return of(this.imagens());
    }

    // Evita múltiplas requisições simultâneas
    if (this.loadingInProgress) {
      return of(this.imagens());
    }

    this.loadingInProgress = true;
    this.loading.set(true);
    this.error.set(null);
    const url = resolveApiUrl('/api/content/images');

    return this.http.get<RepositoryFile[]>(url).pipe(
      // Retry com backoff exponencial: 1s, 2s, 4s
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.warn(`⚠️ Tentativa ${retryCount}/3 de carregar imagens falhou:`, error.message);
          return timer(Math.pow(2, retryCount - 1) * 1000);
        }
      }),
      tap(imagens => {
        this.imagens.set(imagens);
        this.buildImageCache(imagens);
        this.saveToLocalStorage(imagens);
        this.loading.set(false);
        this.loadingInProgress = false;
        console.log(`✅ ${imagens.length} imagens de projetos carregadas do GitHub`);
      }),
      catchError(error => {
        console.error('❌ Erro ao carregar imagens após 3 tentativas:', error);
        this.error.set('Falha ao carregar imagens. Usando cache.');
        this.loading.set(false);
        this.loadingInProgress = false;

        // Se temos cache em memória, usa ele
        if (this.imagens().length > 0) {
          return of(this.imagens());
        }

        // Tenta localStorage como último recurso
        this.loadFromLocalStorage();
        return of(this.imagens());
      })
    );
  }

  /**
   * Força recarregamento das imagens (ignora cache).
   */
  forceReload(): Observable<RepositoryFile[]> {
    localStorage.removeItem(CACHE_KEY);
    this.imagens.set([]);
    this.imageUrlCache.clear();
    this.cacheReady = false;
    this.loadingInProgress = false;
    return this.loadImagens();
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
   * Agora tenta carregar imagens se cache não estiver pronto.
   */
  findBestImageUrl(projectName: string): string | null {
    // Se cache não está pronto, tenta carregar em background
    if (!this.cacheReady && !this.loadingInProgress) {
      console.log('🔄 Cache não pronto, iniciando carregamento em background...');
      this.loadImagens().subscribe();
    }

    if (!this.cacheReady) {
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

  /**
   * Verifica se o cache está pronto.
   */
  isCacheReady(): boolean {
    return this.cacheReady;
  }

  /**
   * Retorna estatísticas do cache.
   */
  getCacheStats(): { entries: number; ready: boolean; source: string } {
    const source = this.imagens().length > 0
      ? (localStorage.getItem(CACHE_KEY) ? 'memory+localStorage' : 'memory')
      : 'empty';
    return {
      entries: this.imageUrlCache.size,
      ready: this.cacheReady,
      source
    };
  }
}

