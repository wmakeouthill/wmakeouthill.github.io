import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, type Observable } from 'rxjs';

export type Language = 'pt' | 'en';

type Translations = Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly http = inject(HttpClient);

  // Estado reativo do idioma atual
  private readonly currentLanguage = signal<Language>(this.detectInitialLanguage());

  // Cache de traduções
  private readonly translations = new Map<Language, Translations>();

  // Idioma atual (somente leitura)
  readonly language = computed(() => this.currentLanguage());

  // Traduções do idioma atual
  readonly translationsSignal = computed(() => {
    const lang = this.currentLanguage();
    return this.translations.get(lang) ?? {};
  });

  constructor() {
    // Pré-carrega o idioma inicial
    this.loadTranslations(this.currentLanguage()).subscribe();

    // Persiste idioma sempre que mudar
    effect(() => {
      const lang = this.currentLanguage();
      localStorage.setItem('portfolio-language', lang);
    });
  }

  setLanguage(lang: Language): void {
    if (lang === this.currentLanguage()) {
      return;
    }
    this.currentLanguage.set(lang);
    if (!this.translations.has(lang)) {
      this.loadTranslations(lang).subscribe();
    }
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
    const saved = localStorage.getItem('portfolio-language');
    if (saved === 'pt' || saved === 'en') {
      return saved;
    }

    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang?.toLowerCase().startsWith('en')) {
      return 'en';
    }

    return 'pt';
  }

  private loadTranslations(lang: Language): Observable<Translations> {
    if (this.translations.has(lang)) {
      return of(this.translations.get(lang)!);
    }

    return this.http.get<Translations>(`/assets/i18n/${lang}.json`).pipe(
      map((translations) => {
        this.translations.set(lang, translations);
        return translations;
      }),
      catchError((error) => {
        console.error(`Erro ao carregar traduções ${lang}:`, error);
        return of({});
      })
    );
  }

  private resolveKey(key: string): unknown {
    const keys = key.split('.');
    let value: unknown = this.translationsSignal();

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
