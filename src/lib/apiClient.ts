import { get } from 'svelte/store';
import { authToken } from './store';

// URL base do backend em producao
const PROD_BASE_URL = 'https://backend-production-6acc.up.railway.app';

// Em ambiente de desenvolvimento o Vite proxia as requisicoes para o mesmo host
const API_BASE_URL = import.meta.env.PROD ? PROD_BASE_URL : '';

type RequestOptions = {
  token?: string | null;
  skipAuth?: boolean;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type TokenOrOptions = string | null | RequestOptions | undefined;

function normalizeOptions(tokenOrOptions?: TokenOrOptions): RequestOptions {
  if (
    tokenOrOptions === undefined ||
    tokenOrOptions === null ||
    typeof tokenOrOptions === 'string'
  ) {
    return tokenOrOptions === undefined ? {} : { token: tokenOrOptions };
  }
  return tokenOrOptions;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const errorText = await response.text();
    if (errorText.includes('<!DOCTYPE html>')) {
      throw new Error('Erro: rota nao encontrada (404). O Vercel tentou chamar a si mesmo.');
    }
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Erro desconhecido';
    throw new Error(`Falha ao analisar a resposta da API: ${message}`);
  }

  if (!response.ok) {
    const fallback =
      typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message?: string }).message
        : undefined;
    throw new Error(fallback || `Ocorreu um erro inesperado: (${response.status})`);
  }

  return data;
}

async function request<TResponse>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown,
  tokenOrOptions?: TokenOrOptions
) {
  const options = normalizeOptions(tokenOrOptions);
  const shouldSkipAuth = options.skipAuth ?? false;
  const resolvedToken = shouldSkipAuth ? null : options.token ?? get(authToken);

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (options.headers) {
    const extra = new Headers(options.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  if (resolvedToken) {
    headers.set('Authorization', `Bearer ${resolvedToken}`);
  } else {
    headers.delete('Authorization');
  }

  const response = await fetch(API_BASE_URL + endpoint, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
  });

  return parseResponse(response) as Promise<TResponse>;
}

export const api = {
  get: async <T = unknown>(endpoint: string, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('GET', endpoint, undefined, tokenOrOptions);
  },
  post: async <T = unknown>(endpoint: string, body: unknown, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('POST', endpoint, body, tokenOrOptions);
  },
  patch: async <T = unknown>(endpoint: string, body: unknown, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('PATCH', endpoint, body, tokenOrOptions);
  },
  delete: async <T = unknown>(endpoint: string, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('DELETE', endpoint, undefined, tokenOrOptions);
  },
};
