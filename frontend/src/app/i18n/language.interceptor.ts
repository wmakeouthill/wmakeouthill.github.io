import { REQUEST, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Adiciona o idioma atual em todas as requisições HTTP.
 *
 * <p>No browser usa {@code localStorage} (evita dependência circular com o
 * HttpClient). No SSR não há {@code localStorage}: o idioma vem da rota ({@code
 * /en}) ou dos headers da requisição, via o token {@code REQUEST}, garantindo
 * que os dados (projetos, README) sejam buscados no idioma correto.</p>
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const language = resolveLanguage();

  const cloned = req.clone({
    setHeaders: {
      'X-Language': language,
      'Accept-Language': language === 'pt' ? 'pt-BR' : 'en-US'
    }
  });

  return next(cloned);
};

function resolveLanguage(): 'pt' | 'en' {
  if (typeof location !== 'undefined') {
    return languageFromPath(location.pathname);
  }
  return resolveServerLanguage();
}

function resolveServerLanguage(): 'pt' | 'en' {
  const request = inject(REQUEST, { optional: true });
  if (!request) {
    return 'pt';
  }
  try {
    return languageFromPath(new URL(request.url).pathname);
  } catch {
    return 'pt';
  }
}

function languageFromPath(path: string): 'pt' | 'en' {
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'pt';
}
