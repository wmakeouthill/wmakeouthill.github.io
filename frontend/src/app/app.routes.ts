import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { ProjectDetailComponent } from './pages/project-detail/project-detail.component';

/**
 * Rotas reais para SEO/SSR. A home agrega as seções; `/projects/:slug` (e a
 * variante `/en`) renderiza o README do projeto no servidor. O prefixo `/en`
 * seleciona o idioma no SSR (ver I18nService/languageInterceptor).
 */
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'projects', component: HomeComponent },
  { path: 'projects/:slug', component: ProjectDetailComponent },
  { path: 'en', component: HomeComponent },
  { path: 'en/projects', component: HomeComponent },
  { path: 'en/projects/:slug', component: ProjectDetailComponent },
  { path: '**', redirectTo: '' }
];
