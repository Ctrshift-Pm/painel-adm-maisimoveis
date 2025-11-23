const DEFAULT_BASE_URL = 'https://backend-production-6acc.up.railway.app';

const envBase = (import.meta as { env?: Record<string, unknown> })?.env?.VITE_API_URL;
const resolvedBase =
  typeof envBase === 'string' && envBase.trim().length > 0
    ? envBase.trim()
    : DEFAULT_BASE_URL;

// Remove barras finais para evitar URLs com "//" quando os endpoints já começam com "/"
export const baseURL = resolvedBase.replace(/\/+$/, '');
