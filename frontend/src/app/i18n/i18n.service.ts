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

  private readonly currentLanguage = signal<Language>(this.detectInitialLanguage());
  private readonly translationsStore = signal<Translations>({});
  private readonly translationsCache: Partial<Record<Language, Translations>> = {};

  readonly language = computed(() => this.currentLanguage());

  constructor() {
    this.loadAndSetTranslations(this.currentLanguage()).subscribe();
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
    const cached = this.translationsCache[lang];
    if (cached) {
      this.translationsStore.set(cached);
    } else {
      this.loadAndSetTranslations(lang).subscribe();
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

  private resolveKey(key: string): unknown {
    const keys = key.split('.');
    let value: unknown = this.translationsStore();

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

  private loadAndSetTranslations(lang: Language): Observable<Translations> {
    return this.http.get<Translations>(`assets/i18n/${lang}.json`).pipe(
      map((translations) => {
        this.translationsCache[lang] = translations;
        if (this.currentLanguage() === lang) {
          this.translationsStore.set(translations);
        }
        return translations;
      }),
      catchError((error) => {
        console.error(`Erro ao carregar traduções ${lang}:`, error);
        this.translationsCache[lang] = {};
        if (this.currentLanguage() === lang) {
          this.translationsStore.set({});
        }
        return of({});
      })
    );
  }
}
