import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Adiciona o idioma atual em todas as requisições.
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const i18n = inject(I18nService);
  const language = i18n.getLanguageForBackend();

  const cloned = req.clone({
    setHeaders: {
      'X-Language': language,
      'Accept-Language': language === 'pt' ? 'pt-BR' : 'en-US'
    }
  });

  return next(cloned);
};
