import { baseURL } from './api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

const PROD_BASE_URL = 'https://backend-production-6acc.up.railway.app';
const DEV_BASE_URL = baseURL ?? '';
const API_BASE_URL = import.meta.env.PROD ? PROD_BASE_URL : DEV_BASE_URL;

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

function resolveUrl(path: string) {
  if (ABSOLUTE_URL_REGEX.test(path)) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    try {
      const errorPayload = await response.json();
      throw new Error(
        errorPayload?.message ??
          errorPayload?.error ??
          `Ocorreu um erro inesperado: ${response.statusText} (${response.status})`
      );
    } catch {
      throw new Error(`Ocorreu um erro inesperado: ${response.statusText} (${response.status})`);
    }
  }

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Resposta inválida do servidor.');
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const url = resolveUrl(path);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!options.skipAuth) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    ...options,
    headers,
  };

  if (body != null) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  return parseResponse<T>(response);
}

export const api = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>('GET', path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>('POST', path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>('PATCH', path, body, options);
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>('PUT', path, body, options);
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>('DELETE', path, undefined, options);
  },
};

export type ApiClient = typeof api;
