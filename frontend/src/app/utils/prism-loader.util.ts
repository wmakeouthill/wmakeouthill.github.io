/**
 * Carregador lazy do PrismJS via npm (substitui os scripts de CDN que ficavam
 * render-blocking no <head>). Importa o core + as gramáticas usadas no portfólio
 * apenas quando o highlight é realmente necessário (chat e modal de README).
 *
 * O tema visual (okaidia) é incluído no bundle global via angular.json.
 */

let prismPromise: Promise<any> | null = null;

/**
 * Garante que o PrismJS e as gramáticas estejam carregados. Idempotente:
 * a importação acontece uma única vez e fica em cache para chamadas seguintes.
 * Mantém `window.Prism` populado para o código existente que o consome.
 */
export function ensurePrism(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (!prismPromise) {
    prismPromise = (async () => {
      // Evita o auto-highlight no DOMContentLoaded — destacamos manualmente.
      const w = window as any;
      w.Prism = w.Prism || {};
      w.Prism.manual = true;

      await import('prismjs');

      // Gramáticas (ordem importa: dependências primeiro).
      // @ts-ignore - componentes do prismjs não têm tipos
      await import('prismjs/components/prism-markup');
      // @ts-ignore
      await import('prismjs/components/prism-clike');
      // @ts-ignore
      await import('prismjs/components/prism-javascript');
      // @ts-ignore
      await import('prismjs/components/prism-typescript');
      // @ts-ignore
      await import('prismjs/components/prism-java');
      // @ts-ignore
      await import('prismjs/components/prism-bash');
      // @ts-ignore
      await import('prismjs/components/prism-json');
      // @ts-ignore
      await import('prismjs/components/prism-css');
      // @ts-ignore
      await import('prismjs/components/prism-python');
      // @ts-ignore
      await import('prismjs/components/prism-sql');

      return w.Prism;
    })();
  }

  return prismPromise;
}
