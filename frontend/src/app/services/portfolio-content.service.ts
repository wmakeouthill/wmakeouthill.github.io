import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, retry, timer } from 'rxjs';
import { map } from 'rxjs/operators';
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

/** Chave para cache de fallback no localStorage */
const CACHE_KEY = 'portfolio_images_cache';

interface CachedImages {
  images: RepositoryFile[];
  timestamp: number;
}

/**
 * Service para acessar conteúdo do portfólio (imagens e documentações)
 * servido pelo backend a partir do repositório GitHub.
 *
 * Estratégia de cache:
 * - Sempre consulta o backend ao carregar (backend usa ETag com GitHub → barato)
 * - Compara SHA dos arquivos para detectar mudanças
 * - Só atualiza localStorage quando há mudança real
 * - localStorage é fallback para erro de rede, não para skip de chamada
 * - TTL em memória de 5 minutos para evitar chamadas repetidas na mesma sessão
 */
@Injectable({
  providedIn: 'root'
})
export class PortfolioContentService {
  private readonly http = inject(HttpClient);

  /** Signal com os arquivos carregados */
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

  /** Timestamp da última consulta ao backend (em memória) */
  private lastBackendCheck = 0;

  /** TTL em memória — dentro deste intervalo não chama o backend novamente */
  private readonly MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor() {
    // Carrega do localStorage como snapshot inicial (exibição imediata)
    // mas NÃO usa para pular a chamada ao backend
    this.loadFromLocalStorageAsSnapshot();
  }

  /**
   * Carrega snapshot do localStorage para exibição imediata.
   * Não impede a consulta ao backend.
   */
  private loadFromLocalStorageAsSnapshot(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedImages = JSON.parse(cached);
        if (data.images?.length > 0) {
          console.log(`📦 Snapshot localStorage: ${data.images.length} imagens (age: ${Math.round((Date.now() - data.timestamp) / 1000)}s)`);
          this.imagens.set(data.images);
          this.buildImageCache(data.images);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar snapshot do localStorage:', e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  /**
   * Persiste cache no localStorage (apenas quando há mudanças).
   */
  private saveToLocalStorage(images: RepositoryFile[]): void {
    try {
      const data: CachedImages = { images, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      console.log(`💾 Cache de ${images.length} imagens salvo no localStorage`);
    } catch (e) {
      console.warn('Erro ao salvar cache no localStorage:', e);
    }
  }

  /**
   * Carrega imagens do backend.
   *
   * - Sempre consulta o backend (backend usa ETag com GitHub — barato)
   * - TTL de 5min em memória evita chamadas repetidas na mesma sessão
   * - Compara SHAs para detectar mudanças reais
   * - Só atualiza sinal e localStorage se houver mudança
   * - Em caso de erro, usa o que já está no sinal (snapshot do localStorage)
   */
  loadImagens(): Observable<RepositoryFile[]> {
    // Previne chamadas duplicadas simultâneas
    if (this.loadingInProgress) {
      return of(this.imagens());
    }

    // TTL em memória: evita chamar o backend a cada re-render dentro da sessão
    const msSinceLastCheck = Date.now() - this.lastBackendCheck;
    if (this.imagens().length > 0 && msSinceLastCheck < this.MEMORY_TTL_MS) {
      return of(this.imagens());
    }

    this.loadingInProgress = true;
    this.loading.set(true);
    this.error.set(null);

    const url = resolveApiUrl('/api/content/images');

    return this.http.get<RepositoryFile[]>(url).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.warn(`⚠️ Tentativa ${retryCount}/3 falhou:`, error.message);
          return timer(Math.pow(2, retryCount - 1) * 1000);
        }
      }),
      tap(imagens => {
        this.lastBackendCheck = Date.now();
        this.loading.set(false);
        this.loadingInProgress = false;

        if (this.hasChanges(imagens)) {
          this.imagens.set(imagens);
          this.buildImageCache(imagens);
          this.saveToLocalStorage(imagens);
          console.log(`✅ ${imagens.length} imagens atualizadas (mudanças detectadas)`);
        } else {
          console.log(`📦 Imagens sem mudanças (${imagens.length} itens, backend confirmou)`);
        }
      }),
      map(() => this.imagens()),
      catchError(error => {
        console.error('❌ Erro ao carregar imagens após retries:', error);
        this.error.set('Falha ao carregar imagens. Usando cache.');
        this.loading.set(false);
        this.loadingInProgress = false;
        // Retorna o que tiver em memória (snapshot do localStorage)
        return of(this.imagens());
      })
    );
  }

  /**
   * Detecta se há mudanças comparando SHAs dos arquivos.
   * SHA é o hash do conteúdo — se não mudou, o arquivo é idêntico.
   */
  private hasChanges(newImages: RepositoryFile[]): boolean {
    const current = this.imagens();
    if (current.length !== newImages.length) return true;
    const currentShas = new Set(current.map(i => i.sha));
    return newImages.some(i => !currentShas.has(i.sha));
  }

  /**
   * Força recarregamento completo (ignora TTL em memória e localStorage).
   */
  forceReload(): Observable<RepositoryFile[]> {
    localStorage.removeItem(CACHE_KEY);
    this.imagens.set([]);
    this.imageUrlCache.clear();
    this.cacheReady = false;
    this.loadingInProgress = false;
    this.lastBackendCheck = 0;
    return this.loadImagens();
  }

  /**
   * Retorna a URL da imagem para um projeto específico.
   */
  getProjectImageUrl(projectName: string): string {
    const cached = this.imageUrlCache.get(projectName.toLowerCase());
    if (cached) {
      return cached;
    }
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

  private generateNameVariations(name: string): string[] {
    const lower = name.toLowerCase().trim();
    const variations = new Set<string>();

    variations.add(lower);
    variations.add(lower.replace(/-/g, '_'));
    variations.add(lower.replace(/_/g, '-'));
    variations.add(lower.replace(/[-_]/g, ''));
    variations.add(lower.replace(/[-_]/g, ' '));
    variations.add(lower.replace(/\s+/g, '-'));
    variations.add(lower.replace(/\s+/g, '_'));
    variations.add(lower.replace(/\s+/g, ''));

    const normalized = lower.replace(/[^a-z0-9\-_\s]/g, '');
    variations.add(normalized);
    variations.add(normalized.replace(/[-_\s]/g, ''));

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
   * Busca a melhor URL de imagem para um projeto com matching fuzzy.
   */
  findBestImageUrl(projectName: string): string | null {
    if (!this.cacheReady && !this.loadingInProgress) {
      console.log('🔄 Cache não pronto, iniciando carregamento em background...');
      this.loadImagens().subscribe();
    }

    if (!this.cacheReady) {
      return null;
    }

    // 1. Match exato com variações
    const variations = this.generateNameVariations(projectName);
    for (const variation of variations) {
      const url = this.imageUrlCache.get(variation);
      if (url) {
        return url;
      }
    }

    // 2. Match parcial (substring)
    const projectLower = projectName.toLowerCase();
    for (const [key, url] of this.imageUrlCache.entries()) {
      if (key.includes(projectLower) || projectLower.includes(key)) {
        console.log(`🔍 Match parcial: "${projectName}" → "${key}"`);
        return url;
      }
    }

    // 3. Match por palavras-chave principais
    const projectWords = projectLower.split(/[-_\s.]+/).filter(w => w.length > 2);
    for (const [key, url] of this.imageUrlCache.entries()) {
      const keyWords = key.split(/[-_\s.]+/).filter(w => w.length > 2);
      const commonWords = projectWords.filter(w => keyWords.includes(w));
      if (commonWords.length >= 2 || (commonWords.length === 1 && commonWords[0].length > 5)) {
        console.log(`🔍 Match por palavras-chave: "${projectName}" → "${key}" (comum: ${commonWords.join(', ')})`);
        return url;
      }
    }

    if (!this.loggedMissing.has(projectLower)) {
      this.loggedMissing.add(projectLower);
      console.debug(`⚠️ Sem imagem para: "${projectName}". Disponíveis: ${this.availableImageNames.join(', ')}`);
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
  getCacheStats(): { entries: number; ready: boolean; lastCheck: string } {
    const age = this.lastBackendCheck
      ? Math.round((Date.now() - this.lastBackendCheck) / 1000) + 's atrás'
      : 'nunca';
    return {
      entries: this.imageUrlCache.size,
      ready: this.cacheReady,
      lastCheck: age
    };
  }
}
