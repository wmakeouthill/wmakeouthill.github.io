import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { getApiUrl } from '../utils/api-url.util';

/**
 * Interface para certificado PDF (vindo do backend)
 */
export interface CertificadoPdf {
  /** Nome do arquivo (ex: "Diploma - Bacharel em Direito.pdf") */
  fileName: string;
  /** Nome formatado para exibição (ex: "Diploma - Bacharel em Direito") */
  displayName: string;
  /** URL para download direto do PDF (não usado - backend serve) */
  downloadUrl: string;
  /** URL da página do arquivo no GitHub */
  htmlUrl: string;
  /** Tamanho em bytes */
  size: number;
  /** SHA do arquivo (para cache) */
  sha: string;
}

/**
 * Serviço para buscar certificados e currículo via backend.
 *
 * O backend é responsável por:
 * - Autenticar com o GitHub usando o token seguro
 * - Buscar os PDFs do repositório wmakeouthill/certificados-wesley
 * - Servir os PDFs para o frontend
 *
 * O frontend apenas consome os endpoints:
 * - GET /api/certifications → lista de certificados
 * - GET /api/certifications/curriculo → metadados do currículo
 * - GET /api/certifications/curriculo/pdf → PDF do currículo
 * - GET /api/certifications/{fileName}/pdf → PDF de um certificado
 */
@Injectable({
  providedIn: 'root'
})
export class CertificationsService {
  private readonly http = inject(HttpClient);

  private readonly API_BASE = getApiUrl();

  /** Signal com os certificados carregados */
  readonly certificados = signal<CertificadoPdf[]>([]);

  /** Signal com o currículo */
  readonly curriculo = signal<CertificadoPdf | null>(null);

  /** Signal de loading */
  readonly loading = signal(false);

  /** Signal de erro */
  readonly error = signal<string | null>(null);

  /** Computed: tem certificados? */
  readonly hasCertificados = computed(() => this.certificados().length > 0);

  /** Computed: tem currículo? */
  readonly hasCurriculo = computed(() => this.curriculo() !== null);

  /**
   * Carrega todos os certificados e currículo do backend
   */
  loadAll(): Observable<{ certificados: CertificadoPdf[]; curriculo: CertificadoPdf | null }> {
    this.loading.set(true);
    this.error.set(null);

    // Carrega certificados e currículo em paralelo
    return this.http.get<CertificadoPdf[]>(`${this.API_BASE}/api/certifications`).pipe(
      tap(certificados => {
        this.certificados.set(certificados);
        console.log(`✅ Carregados ${certificados.length} certificados do backend`);
      }),
      map(certificados => ({ certificados, curriculo: null as CertificadoPdf | null })),
      tap(() => {
        // Carrega currículo separadamente
        this.loadCurriculoInternal();
        this.loading.set(false);
      }),
      catchError(err => {
        console.error('Erro ao carregar certificados:', err);
        this.error.set('Não foi possível carregar os certificados');
        this.loading.set(false);
        return of({ certificados: [], curriculo: null });
      })
    );
  }

  /**
   * Carrega apenas os certificados
   */
  loadCertificados(): Observable<CertificadoPdf[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<CertificadoPdf[]>(`${this.API_BASE}/api/certifications`).pipe(
      tap(certificados => {
        this.certificados.set(certificados);
        this.loading.set(false);
        console.log(`✅ Carregados ${certificados.length} certificados`);
      }),
      catchError(err => {
        console.error('Erro ao carregar certificados:', err);
        this.error.set('Não foi possível carregar os certificados');
        this.loading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Carrega apenas o currículo
   */
  loadCurriculo(): Observable<CertificadoPdf | null> {
    return this.http.get<CertificadoPdf>(`${this.API_BASE}/api/certifications/curriculo`).pipe(
      tap(curriculo => {
        this.curriculo.set(curriculo);
        console.log('✅ Currículo carregado:', curriculo.fileName);
      }),
      catchError(err => {
        console.warn('Currículo não encontrado no backend:', err);
        this.curriculo.set(null);
        return of(null);
      })
    );
  }

  /**
   * Carrega currículo internamente (sem retornar Observable)
   */
  private loadCurriculoInternal(): void {
    this.http.get<CertificadoPdf>(`${this.API_BASE}/api/certifications/curriculo`).pipe(
      tap(curriculo => {
        this.curriculo.set(curriculo);
        console.log('✅ Currículo carregado:', curriculo.fileName);
      }),
      catchError(err => {
        console.warn('Currículo não encontrado:', err);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Retorna a URL do PDF do currículo (servido pelo backend)
   */
  getCurriculoPdfUrl(): string {
    const lang = this.getLanguage();
    return `${this.API_BASE}/api/certifications/curriculo/pdf?lang=${lang}&v=${Date.now()}`;
  }

  /**
   * Retorna a URL do PDF de um certificado (servido pelo backend)
   */
  getCertificadoPdfUrl(fileName: string): string {
    // Mantém o nome completo com .pdf para garantir match correto
    const encodedFileName = encodeURIComponent(fileName);
    return `${this.API_BASE}/api/certifications/${encodedFileName}/pdf`;
  }

  /**
   * Retorna a URL do thumbnail (preview) de um certificado
   */
  getCertificadoThumbnailUrl(fileName: string): string {
    // Mantém o nome completo com .pdf para garantir match correto
    const encodedFileName = encodeURIComponent(fileName);
    return `${this.API_BASE}/api/certifications/${encodedFileName}/thumbnail`;
  }

  /**
   * Retorna a URL do thumbnail (preview) do currículo
   */
  getCurriculoThumbnailUrl(): string {
    const lang = this.getLanguage();
    return `${this.API_BASE}/api/certifications/curriculo/thumbnail?lang=${lang}&v=${Date.now()}`;
  }

  private getLanguage(): string {
    try {
      // interceptor também seta header, mas aqui garantimos query param
      const lang = localStorage.getItem('portfolio-language');
      return lang === 'en' ? 'en' : 'pt';
    } catch {
      return 'pt';
    }
  }

  /**
   * Força recarregamento
   */
  refresh(): Observable<{ certificados: CertificadoPdf[]; curriculo: CertificadoPdf | null }> {
    return this.loadAll();
  }
}
