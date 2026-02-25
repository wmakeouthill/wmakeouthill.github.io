import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { getApiKey } from '../utils/api-url.util';

/**
 * Interceptor que anexa o header `X-API-Key` a todas as requisições API
 * feitas para o backend na Oracle Cloud.
 */
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  // Ignora chamadas locais como JSON de i18n
  if (req.url.startsWith('./') || req.url.startsWith('/assets/')) {
    return next(req);
  }

  const apiKey = getApiKey();
  
  if (apiKey) {
    const clonedReq = req.clone({
      headers: req.headers.set('X-API-Key', apiKey)
    });
    return next(clonedReq);
  }

  // Passa adiante se não houver chave (fallback/local dev sem chave configurada)
  return next(req);
};
