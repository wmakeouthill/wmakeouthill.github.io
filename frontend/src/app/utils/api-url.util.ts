const STORAGE_KEY = 'api_base_url';
const DEV_FRONTEND_PORT = '4200';
const DEV_BACKEND_PORT = '8080';

export function resolveApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);

  const customBase = readCustomBaseUrl();
  if (customBase) {
    return `${customBase}${normalizedPath}`;
  }

  const origin = resolveOriginFromWindow();
  if (origin) {
    return `${origin}${normalizedPath}`;
  }

  return normalizedPath;
}

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Resolve a URL de uma mídia/arquivo que será EMBUTIDA no HTML (ex.: `src` de
 * `<img>`, `href` de PDF) e buscada diretamente pelo browser.
 *
 * Diferente de {@link resolveApiUrl}: no SSR (Node) NUNCA usa a base absoluta do
 * backend (`http://137.x.x.x:8080`). Essa base vazaria para o HTML entregue ao
 * cliente e o browser bloquearia o recurso por Mixed Content (página HTTPS
 * pedindo recurso HTTP). No SSR retorna um caminho relativo (`/api/...`), que o
 * browser resolve contra a origem HTTPS da página (passando pelo proxy /api).
 * No browser, resolve contra a origem atual (tratando o dev 4200 -> 8080).
 */
export function resolveMediaUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  const origin = resolveOriginFromWindow();
  if (origin) {
    return `${origin}${normalizedPath}`;
  }
  return normalizedPath;
}

function readCustomBaseUrl(): string | null {
  const baseFromSession = readFromSessionStorage();
  if (baseFromSession) {
    return baseFromSession;
  }

  if (isServerRuntime()) {
    const serverBase = readFromProcessEnv();
    if (serverBase) {
      return serverBase;
    }
  }

  const envBase = readFromImportMetaEnv();
  if (envBase) {
    return envBase;
  }

  // No SSR (Node) não há window/sessionStorage: a base vem de process.env,
  // apontando para o backend Spring. Sem isso, URLs relativas resolveriam
  // contra a origem do renderer (Node) e dariam 404 + retries lentos.
  return null;
}

function isServerRuntime(): boolean {
  return typeof window === 'undefined';
}

function readFromProcessEnv(): string | null {
  if (typeof process === 'undefined' || !process.env) {
    return null;
  }
  // Prioridade no SSR (Node):
  // 1. SSR_API_BASE_URL — alvo explicito (ex.: Oracle self-host -> 127.0.0.1:8080).
  // 2. VERCEL_URL — na Vercel o proprio deployment serve as funcoes /api (proxy que
  //    injeta X-API-Key e encaminha pro Oracle). Chamar a propria origem evita bater
  //    no backend sem a chave (401). VERCEL_URL e injetado automaticamente e vem sem
  //    protocolo, por isso o https:// na frente.
  // 3. API_BASE_URL — fallback legado (alvo bruto do backend, sem a chave).
  const explicit = process.env['SSR_API_BASE_URL'];
  if (isNonEmptyEnv(explicit)) {
    return trimTrailingSlash(explicit.trim());
  }
  const vercelUrl = process.env['VERCEL_URL'];
  if (isNonEmptyEnv(vercelUrl)) {
    return trimTrailingSlash(`https://${vercelUrl.trim()}`);
  }
  const apiBase = process.env['API_BASE_URL'];
  if (isNonEmptyEnv(apiBase)) {
    return trimTrailingSlash(apiBase.trim());
  }
  return null;
}

function isNonEmptyEnv(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readFromSessionStorage(): string | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const trimmed = stored.trim();
    return trimmed.length > 0 ? trimTrailingSlash(trimmed) : null;
  } catch {
    return null;
  }
}

function readFromImportMetaEnv(): string | null {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  if (!env) {
    return null;
  }

  const envBase = env['NG_APP_API_BASE_URL'];
  if (!envBase) {
    return null;
  }
  const trimmed = envBase.trim();
  return trimmed.length > 0 ? trimTrailingSlash(trimmed) : null;
}

function resolveOriginFromWindow(): string | null {
  if (typeof window === 'undefined' || !window.location) {
    return null;
  }

  const { origin, hostname, port, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (port === DEV_FRONTEND_PORT) {
      return `${protocol}//${hostname}:${DEV_BACKEND_PORT}`;
    }
    return origin;
  }

  return origin;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Retorna a URL base da API (sem path).
 * Útil para construir URLs de endpoints manualmente.
 */
export function getApiUrl(): string {
  const customBase = readCustomBaseUrl();
  if (customBase) {
    return customBase;
  }

  const origin = resolveOriginFromWindow();
  if (origin) {
    return origin;
  }

  return '';
}

/**
 * Retorna a API Key configurada para autenticação.
 */
export function getApiKey(): string | null {
  const keyFromSession = readApiKeyFromSessionStorage();
  if (keyFromSession) {
    return keyFromSession;
  }

  // No SSR (Node) não há sessionStorage: quando o render bate direto no backend
  // Oracle (SSR_API_BASE_URL), a chave precisa vir de process.env, senão o
  // backend devolve 401. No browser process é undefined, então isso é no-op.
  if (isServerRuntime()) {
    return readApiKeyFromProcessEnv();
  }

  return null;
}

function readApiKeyFromProcessEnv(): string | null {
  if (typeof process === 'undefined' || !process.env) {
    return null;
  }
  const key = process.env['API_KEY'];
  return isNonEmptyEnv(key) ? key.trim() : null;
}

function readApiKeyFromSessionStorage(): string | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const stored = window.sessionStorage.getItem('api_key');
    if (!stored) {
      return null;
    }
    const trimmed = stored.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

