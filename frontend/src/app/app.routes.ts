import { Routes } from '@angular/router';

/**
 * Rotas reais para SEO/SSR. A home agrega as seções; `/projects/:slug` (e a
 * variante `/en`) renderiza o README do projeto no servidor. O prefixo `/en`
 * seleciona o idioma no SSR (ver I18nService/languageInterceptor).
 *
 * Componentes em lazy `loadComponent`: tira HomeComponent (todas as seções) e
 * ProjectDetailComponent do main.js. O SSR ainda resolve e renderiza o HTML
 * completo da rota no source (LCP/SEO intactos); no browser o chunk da rota
 * pré-carrega em paralelo via modulepreload.
 */
const home = () => import('./pages/home/home.component').then(m => m.HomeComponent);
const projectDetail = () =>
  import('./pages/project-detail/project-detail.component').then(m => m.ProjectDetailComponent);

export const routes: Routes = [
  { path: '', loadComponent: home },
  { path: 'projects', loadComponent: home },
  { path: 'projects/:slug', loadComponent: projectDetail },
  { path: 'en', loadComponent: home },
  { path: 'en/projects', loadComponent: home },
  { path: 'en/projects/:slug', loadComponent: projectDetail },
  { path: '**', redirectTo: '' }
];
