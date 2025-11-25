import { authToken } from './store';

const DEFAULT_BASE_URL = 'https://backend-production-6acc.up.railway.app';

const envBase = (import.meta as { env?: Record<string, unknown> })?.env?.VITE_API_URL;
const resolvedBase =
  typeof envBase === 'string' && envBase.trim().length > 0
    ? envBase.trim()
    : DEFAULT_BASE_URL;

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
