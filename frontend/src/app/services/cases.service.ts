import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';

import type { Language } from '../i18n/i18n.service';
import { CaseItem } from '../models/interfaces';
import { resolveApiUrl } from '../utils/api-url.util';

/**
 * Carrega os cases profissionais do backend. Cache em memoria por idioma evita
 * nova requisicao ao alternar entre abas.
 */
@Injectable({ providedIn: 'root' })
export class CasesService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<Language, Observable<CaseItem[]>>();

  getCases(lang: Language): Observable<CaseItem[]> {
    let cases$ = this.cache.get(lang);
    if (!cases$) {
      const url = resolveApiUrl(`/api/content/cases?lang=${lang}`);
      cases$ = this.http.get<CaseItem[]>(url).pipe(
        catchError(() => {
          this.cache.delete(lang);
          return of([]);
        }),
        shareReplay(1)
      );
      this.cache.set(lang, cases$);
    }
    return cases$;
  }
}