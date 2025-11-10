import { baseURL } from './api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(method: HttpMethod, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : `${baseURL}${path}`;

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

  const response = await fetch(url, {
    method,
    body: body != null ? JSON.stringify(body) : undefined,
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : (null as T);

  if (!response.ok) {
    const message = (data as unknown as { error?: string })?.error ?? response.statusText ?? 'Erro na requisicao.';
    throw new Error(message);
  }

  return data;
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
