import { authToken } from './store';

const metaEnv = (import.meta as { env?: Record<string, unknown> })?.env ?? {};
const envBase = metaEnv.VITE_API_URL;
const isDev = Boolean(metaEnv.DEV);
const resolvedBase =
  typeof envBase === 'string' && envBase.trim().length > 0
    ? envBase.trim()
    : isDev
      ? 'http://localhost:3333'
      : '';

if (!resolvedBase) {
  throw new Error('VITE_API_URL não configurado. Configure no .env do painel.');
}

// Remove barras finais para evitar URLs com "//" quando os endpoints já começam com "/"
export const baseURL = resolvedBase.replace(/\/+$/, '');

export function handleUnauthorizedResponse(status?: number): boolean {
  if (status === 401) {
    authToken.set(null);
    try {
      localStorage.removeItem('authToken');
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return true;
  }
  return false;
}
