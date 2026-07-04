import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, PLATFORM_ID, ViewEncapsulation, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { catchError, of, timeout } from 'rxjs';

import { I18nService } from '../../i18n/i18n.service';
import { resolveApiUrl } from '../../utils/api-url.util';
import { SeoService } from '../../services/seo.service';

/**
 * Página de detalhe de um projeto (`/projects/:slug` e `/en/projects/:slug`).
 * Busca o README já renderizado em HTML no backend (commonmark; blocos Mermaid
 * vêm como {@code <pre class="mermaid">}) e o serializa no SSR dentro de um
 * {@code <article>}, deixando o conteúdo no source para o Googlebot. No browser,
 * o conteúdo é hidratado e os diagramas Mermaid são renderizados client-side.
 */
@Component({
  selector: 'app-project-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
  encapsulation: ViewEncapsulation.None
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(I18nService);
  private readonly seoService = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Carrega mermaid uma única vez por sessão (lazy, só no browser). */
  private static mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

  /** Teto de espera pelo backend no SSR: degrada em vez de estourar a função. */
  private static readonly README_TIMEOUT_MS = 20000;

  readonly slug = signal<string>('');
  readonly readme = signal<SafeHtml | null>(null);
  readonly loading = signal<boolean>(true);
  readonly notFound = signal<boolean>(false);

  ngOnInit(): void {
    const slug = (this.route.snapshot.paramMap.get('slug') ?? '').toLowerCase();
    this.slug.set(slug);
    this.seoService.aplicarParaRotaAtual();
    this.carregarReadme(slug);
  }

  /** Rótulo do projeto (slug "titulizado") para breadcrumb e fallback. */
  titulo(): string {
    return this.slug()
      .split(/[-_]/)
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(' ');
  }

  /** Href localizado para a lista de projetos (home). */
  voltarHref(): string {
    return this.i18n.language() === 'en' ? '/en' : '/';
  }

  rotuloVoltar(): string {
    return this.i18n.language() === 'en' ? 'Back to projects' : 'Voltar aos projetos';
  }

  mensagemNaoEncontrado(): string {
    return this.i18n.language() === 'en'
      ? 'README not found for this project.'
      : 'README não encontrado para este projeto.';
  }

  private carregarReadme(slug: string): void {
    if (!slug) {
      this.naoEncontrado();
      return;
    }
    const url = resolveApiUrl(`/api/projects/${encodeURIComponent(slug)}/markdown/html`);
    this.http.get(url, { responseType: 'text' })
      .pipe(
        timeout({ first: ProjectDetailComponent.README_TIMEOUT_MS }),
        catchError(() => of(null))
      )
      .subscribe((html) => {
        if (html && html.trim().length > 0) {
          this.readme.set(this.sanitizer.bypassSecurityTrustHtml(html));
          this.loading.set(false);
          this.renderizarMermaid();
        } else {
          this.naoEncontrado();
        }
      });
  }

  /**
   * Renderiza os blocos {@code <pre class="mermaid">} em SVG no browser. Roda
   * só no cliente (mermaid depende do DOM) e tolera falha — o código fica como
   * texto legível/indexável caso o render quebre.
   */
  private renderizarMermaid(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Espera o Angular pintar o innerHTML antes de procurar os blocos.
    setTimeout(async () => {
      const blocos = this.host.nativeElement.querySelectorAll<HTMLElement>('pre.mermaid');
      if (blocos.length === 0) {
        return;
      }
      try {
        const mermaid = await this.carregarMermaid();
        await mermaid.run({ nodes: Array.from(blocos) });
      } catch (error_) {
        console.warn('Falha ao renderizar diagramas Mermaid:', error_);
      }
    }, 0);
  }

  private carregarMermaid(): Promise<typeof import('mermaid').default> {
    ProjectDetailComponent.mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose'
      });
      return mermaid;
    });
    return ProjectDetailComponent.mermaidPromise;
  }

  private naoEncontrado(): void {
    this.loading.set(false);
    this.notFound.set(true);
  }
}
