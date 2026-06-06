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
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('portfolio-language') === 'en' ? 'en' : 'pt';
  }
  return resolveServerLanguage();
}

/** Idioma no SSR: prefixo /en na rota tem prioridade; senão, Accept-Language. */
function resolveServerLanguage(): 'pt' | 'en' {
  const request = inject(REQUEST, { optional: true });
  if (!request) {
    return 'pt';
  }
  try {
    const path = new URL(request.url).pathname;
    if (path === '/en' || path.startsWith('/en/')) {
      return 'en';
    }
  } catch {
    // URL inválida: cai no header.
  }
  const header = request.headers.get('x-language') ?? request.headers.get('accept-language');
  return header?.toLowerCase().startsWith('en') ? 'en' : 'pt';
}
