import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Adiciona o idioma atual em todas as requisições.
 * Usa localStorage para evitar dependência circular com HttpClient.
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const stored = localStorage.getItem('portfolio-language');
  const language = stored === 'en' ? 'en' : 'pt';

  const cloned = req.clone({
    setHeaders: {
      'X-Language': language,
      'Accept-Language': language === 'pt' ? 'pt-BR' : 'en-US'
    }
  });

  return next(cloned);
};
