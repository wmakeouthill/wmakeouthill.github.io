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

function readCustomBaseUrl(): string | null {
  const baseFromSession = readFromSessionStorage();
  if (baseFromSession) {
    return baseFromSession;
  }

  const envBase = readFromImportMetaEnv();
  if (envBase) {
    return envBase;
  }

  return null;
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

  const envBase = env['NG_APP_API_BASE_URL'] ?? env['API_BASE_URL'];
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

