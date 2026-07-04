import { Injectable, PLATFORM_ID, REQUEST, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import ptTranslations from '../../assets/i18n/pt.json';
import enTranslations from '../../assets/i18n/en.json';

export type Language = 'pt' | 'en';

type Translations = Record<string, unknown>;

// Traduções embutidas no bundle (não via HTTP). Disponíveis de forma síncrona e
// idêntica no SSR e no cliente: o HTML já sai com o texto final (bom p/ SEO),
// sem re-fetch do JSON no cliente e sem troca de labels pós-paint — o que antes
// causava reflow (CLS) e risco de hydration mismatch.
const TRANSLATIONS: Record<Language, Translations> = {
  pt: ptTranslations,
  en: enTranslations
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, { optional: true });

  private readonly currentLanguage = signal<Language>(this.detectInitialLanguage());
  private readonly translationsStore = signal<Translations>(TRANSLATIONS[this.currentLanguage()]);

  readonly language = computed(() => this.currentLanguage());
  // Usado para disparar atualização no pipe quando o idioma muda
  readonly translationsSignal = computed(() => this.translationsStore());

  constructor() {
    // localStorage só existe no browser; no SSR o idioma vem da rota/header.
    if (this.isBrowser) {
      effect(() => {
        const lang = this.currentLanguage();
        localStorage.setItem('portfolio-language', lang);
      });
    }
  }

  setLanguage(lang: Language): void {
    if (lang === this.currentLanguage()) {
      return;
    }
    this.currentLanguage.set(lang);
    this.translationsStore.set(TRANSLATIONS[lang]);
  }

  translate(key: string, params?: Record<string, unknown>): string {
    const value = this.resolveKey(key);
    if (typeof value !== 'string') {
      return key;
    }
    return params ? this.replaceParams(value, params) : value;
  }

  getLanguageForBackend(): string {
    return this.currentLanguage();
  }

  private detectInitialLanguage(): Language {
    if (!this.isBrowser) {
      return this.detectServerLanguage();
    }
    return this.languageFromPath(globalThis.location?.pathname ?? '/');
  }

  private detectServerLanguage(): Language {
    const req = this.request;
    if (!req) {
      return 'pt';
    }
    try {
      return this.languageFromPath(new URL(req.url).pathname);
    } catch {
      return 'pt';
    }
  }

  private languageFromPath(path: string): Language {
    return path === '/en' || path.startsWith('/en/') ? 'en' : 'pt';
  }

  private resolveKey(key: string): unknown {
    const translations = this.translationsStore();
    if (!translations || Object.keys(translations).length === 0) {
      return undefined;
    }

    const keys = key.split('.');
    let value: unknown = translations;

    for (const currentKey of keys) {
      if (value && typeof value === 'object' && currentKey in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[currentKey];
      } else {
        console.warn(`Tradução não encontrada: ${key}`);
        return undefined;
      }
    }

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private replaceParams(text: string, params: Record<string, unknown>): string {
    return text.replace(/\{(\w+)\}/g, (match, paramKey) => {
      const replacement = params[paramKey];
      return replacement === undefined ? match : String(replacement);
    });
  }
}
