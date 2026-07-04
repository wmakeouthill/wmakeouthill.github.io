import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import type { Language } from '../i18n/i18n.service';

interface PageSeo {
  readonly title: string;
  readonly description: string;
}

/**
 * Metadados de SEO por idioma. Mantidos como constantes (não via i18n async)
 * para garantir que o SSR sempre serialize título/descrição corretos, mesmo
 * que o carregamento das traduções falhe.
 */
const METADADOS: Record<Language, { home: PageSeo; projects: PageSeo }> = {
  pt: {
    home: {
      title: 'Wesley de Carvalho — Desenvolvedor Full Stack',
      description:
        'Portfólio de Wesley de Carvalho Augusto Correia, desenvolvedor Full Stack. '
        + 'Projetos, experiência e habilidades em Java, Spring, Angular e mais.'
    },
    projects: {
      title: 'Projetos — Wesley de Carvalho',
      description:
        'Projetos open source e profissionais de Wesley de Carvalho: aplicações '
        + 'Full Stack em Java, Spring, Angular, automação e IA.'
    }
  },
  en: {
    home: {
      title: 'Wesley de Carvalho — Full Stack Developer',
      description:
        'Portfolio of Wesley de Carvalho Augusto Correia, Full Stack developer. '
        + 'Projects, experience and skills in Java, Spring, Angular and more.'
    },
    projects: {
      title: 'Projects — Wesley de Carvalho',
      description:
        'Open source and professional projects by Wesley de Carvalho: Full Stack '
        + 'applications in Java, Spring, Angular, automation and AI.'
    }
  }
};

const BASE_URL_PADRAO = 'https://wmakeouthill.dev';
const OG_IMAGE = '/assets/wesley-photo.jpg';

/**
 * Aplica os metadados de SEO (title, description, Open Graph, Twitter, canonical
 * e hreflang) conforme a rota e o idioma atuais. Funciona no SSR — as tags são
 * serializadas no HTML de origem — e no browser, após a hidratação.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, { optional: true });

  /** Define todas as tags de SEO a partir do path e idioma correntes. */
  aplicarParaRotaAtual(): void {
    const caminho = this.caminhoAtual();
    const idioma = this.idiomaDaRota(caminho);
    const ptPath = this.normalizarParaPt(caminho);
    const meta = this.metadadosDe(ptPath, idioma);

    this.title.setTitle(meta.title);
    this.definirDescricao(meta.description);
    this.definirOpenGraph(meta, idioma, ptPath);
    this.definirCanonicalEAlternates(ptPath, idioma);
    this.definirJsonLd(ptPath, idioma);
    this.document.documentElement.lang = idioma;
  }

  private metadadosDe(ptPath: string, idioma: Language): PageSeo {
    const conjunto = METADADOS[idioma];
    if (ptPath.startsWith('/cases/')) {
      const slug = ptPath.substring('/cases/'.length);
      return {
        title: `${this.titulizar(slug)} — Case — Wesley de Carvalho`,
        description: conjunto.projects.description
      };
    }
    if (ptPath.startsWith('/projects/')) {
      const slug = ptPath.substring('/projects/'.length);
      return {
        title: `${this.titulizar(slug)} — Wesley de Carvalho`,
        description: conjunto.projects.description
      };
    }
    if (ptPath.startsWith('/projects')) {
      return conjunto.projects;
    }
    return conjunto.home;
  }

  private definirDescricao(descricao: string): void {
    this.meta.updateTag({ name: 'description', content: descricao });
  }

  private definirOpenGraph(meta: PageSeo, idioma: Language, ptPath: string): void {
    const url = this.urlAbsoluta(this.caminhoPara(ptPath, idioma));
    const imagem = this.urlAbsoluta(OG_IMAGE);
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: meta.title });
    this.meta.updateTag({ property: 'og:description', content: meta.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: imagem });
    this.meta.updateTag({ property: 'og:locale', content: idioma === 'pt' ? 'pt_BR' : 'en_US' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: meta.title });
    this.meta.updateTag({ name: 'twitter:description', content: meta.description });
    this.meta.updateTag({ name: 'twitter:image', content: imagem });
  }

  private definirCanonicalEAlternates(ptPath: string, idioma: Language): void {
    this.upsertLink('canonical', null, this.urlAbsoluta(this.caminhoPara(ptPath, idioma)));
    this.upsertLink('alternate', 'pt-BR', this.urlAbsoluta(this.caminhoPara(ptPath, 'pt')));
    this.upsertLink('alternate', 'en-US', this.urlAbsoluta(this.caminhoPara(ptPath, 'en')));
    this.upsertLink('alternate', 'x-default', this.urlAbsoluta(this.caminhoPara(ptPath, 'pt')));
  }

  /** JSON-LD por rota: Person+WebSite na home; Breadcrumb+SoftwareSourceCode/CreativeWork nos detalhes. */
  private definirJsonLd(ptPath: string, idioma: Language): void {
    let grafo: unknown;
    if (ptPath.startsWith('/cases/')) {
      grafo = this.jsonLdCase(ptPath, idioma);
    } else if (ptPath.startsWith('/projects/')) {
      grafo = this.jsonLdProjeto(ptPath, idioma);
    } else {
      grafo = this.jsonLdPessoa();
    }
    this.upsertJsonLd(JSON.stringify(grafo));
  }
  private jsonLdPessoa(): unknown {
    const base = this.baseUrl();
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          name: 'Wesley de Carvalho Augusto Correia',
          url: `${base}/`,
          image: this.urlAbsoluta(OG_IMAGE),
          jobTitle: 'Full Stack Developer',
          sameAs: ['https://github.com/wmakeouthill']
        },
        { '@type': 'WebSite', name: 'Wesley de Carvalho', url: `${base}/` }
      ]
    };
  }

  private jsonLdProjeto(ptPath: string, idioma: Language): unknown {
    const slug = ptPath.substring('/projects/'.length);
    const nome = this.titulizar(slug);
    const url = this.urlAbsoluta(this.caminhoPara(ptPath, idioma));
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: idioma === 'en' ? 'Home' : 'Início', item: this.urlAbsoluta(this.caminhoPara('/', idioma)) },
            { '@type': 'ListItem', position: 2, name: nome, item: url }
          ]
        },
        {
          '@type': 'SoftwareSourceCode',
          name: nome,
          url,
          author: { '@type': 'Person', name: 'Wesley de Carvalho Augusto Correia' },
          codeRepository: `https://github.com/wmakeouthill/${slug}`
        }
      ]
    };
  }

  /** Case profissional: CreativeWork, sem codeRepository porque pode envolver cliente privado. */
  private jsonLdCase(ptPath: string, idioma: Language): unknown {
    const slug = ptPath.substring('/cases/'.length);
    const nome = this.titulizar(slug);
    const url = this.urlAbsoluta(this.caminhoPara(ptPath, idioma));
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: idioma === 'en' ? 'Home' : 'Início', item: this.urlAbsoluta(this.caminhoPara('/', idioma)) },
            { '@type': 'ListItem', position: 2, name: nome, item: url }
          ]
        },
        {
          '@type': 'CreativeWork',
          name: nome,
          url,
          author: { '@type': 'Person', name: 'Wesley de Carvalho Augusto Correia' }
        }
      ]
    };
  }
  private upsertJsonLd(json: string): void {
    let script = this.document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld]');
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo-jsonld', '');
      this.document.head.appendChild(script);
    }
    script.textContent = json;
  }

  /** Cria ou atualiza um <link> (canonical/alternate) de forma idempotente. */
  private upsertLink(rel: string, hreflang: string | null, href: string): void {
    const seletor = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]`;
    let elemento = this.document.head.querySelector<HTMLLinkElement>(seletor);
    if (!elemento) {
      elemento = this.document.createElement('link');
      elemento.setAttribute('rel', rel);
      if (hreflang) {
        elemento.setAttribute('hreflang', hreflang);
      }
      this.document.head.appendChild(elemento);
    }
    elemento.setAttribute('href', href);
  }

  /** Path corrente: do REQUEST no servidor, de location no browser. */
  private caminhoAtual(): string {
    if (this.isServer && this.request) {
      try {
        return new URL(this.request.url).pathname;
      } catch {
        return '/';
      }
    }
    return this.document.location?.pathname ?? '/';
  }

  /** Remove o prefixo /en, devolvendo o path canônico em português. */
  private normalizarParaPt(caminho: string): string {
    const limpo = this.semBarraFinal(caminho);
    if (limpo === '/en') {
      return '/';
    }
    if (limpo.startsWith('/en/')) {
      return limpo.substring(3);
    }
    return limpo === '' ? '/' : limpo;
  }

  private idiomaDaRota(caminho: string): Language {
    const limpo = this.semBarraFinal(caminho);
    return limpo === '/en' || limpo.startsWith('/en/') ? 'en' : 'pt';
  }

  /** Reconstrói o path no idioma alvo a partir do path em português. */
  private caminhoPara(ptPath: string, idioma: Language): string {
    if (idioma === 'pt') {
      return ptPath;
    }
    return ptPath === '/' ? '/en' : `/en${ptPath}`;
  }

  private urlAbsoluta(caminho: string): string {
    return `${this.baseUrl()}${caminho}`;
  }

  private baseUrl(): string {
    if (this.isServer) {
      const env = typeof process !== 'undefined' && process.env
        ? process.env['PUBLIC_SITE_BASE_URL']
        : null;
      return this.semBarraFinal(env?.trim() || BASE_URL_PADRAO);
    }
    return this.document.location?.origin ?? BASE_URL_PADRAO;
  }

  private semBarraFinal(valor: string): string {
    return valor.endsWith('/') && valor.length > 1 ? valor.slice(0, -1) : valor;
  }

  private titulizar(slug: string): string {
    return slug
      .split(/[-_]/)
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(' ');
  }
}
