import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // SSR dinâmico por request (não prerender no build): o conteúdo depende
    // de chamadas HTTP ao backend, que só existem em runtime. O Spring atua
    // como edge cache na frente do renderer Node.
    path: '**',
    renderMode: RenderMode.Server
  }
];
