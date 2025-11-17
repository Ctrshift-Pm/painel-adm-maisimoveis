import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios';
import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { authToken } from './store';

const PROD_BASE_URL = 'https://backend-production-6acc.up.railway.app';
const API_BASE_URL = import.meta.env.PROD ? PROD_BASE_URL : '';

type RequestOptions = {
  token?: string | null;
  skipAuth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, unknown>;
};

type TokenOrOptions = string | null | RequestOptions | undefined;

type ExtendedAxiosConfig = AxiosRequestConfig & {
  token?: string | null;
  skipAuth?: boolean;
};

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

function buildConfig(tokenOrOptions?: TokenOrOptions): ExtendedAxiosConfig {
  const options = normalizeOptions(tokenOrOptions);
  const config: ExtendedAxiosConfig = {
    headers: options.headers,
    signal: options.signal,
    params: options.params,
    token: options.token,
    skipAuth: options.skipAuth,
  };
  return config;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const extended = config as ExtendedAxiosConfig;
  const shouldSkipAuth = extended.skipAuth ?? false;
  const resolvedToken = shouldSkipAuth ? null : extended.token ?? get(authToken);

  const headers = config.headers ?? new AxiosHeaders();
  config.headers = headers;

  const setHeader = (value: string | null) => {
    if (headers instanceof AxiosHeaders) {
      if (value) {
        headers.set('Authorization', `Bearer ${value}`);
      } else {
        headers.delete('Authorization');
      }
    } else {
      const record = headers as Record<string, string>;
      if (value) {
        record['Authorization'] = `Bearer ${value}`;
      } else {
        delete (record as Record<string, unknown>)['Authorization'];
      }
    }
  };

  setHeader(resolvedToken);

  delete extended.token;
  delete extended.skipAuth;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      return Promise.reject(error);
    }

    const fallbackMessage =
      error.response?.data?.message ||
      error.message ||
      'Erro ao se comunicar com o servidor.';
    toast.error(fallbackMessage);
    return Promise.reject(error);
  }
);

async function request<TResponse>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown,
  tokenOrOptions?: TokenOrOptions
) {
  const config = buildConfig(tokenOrOptions);
  const response = await apiClient.request<TResponse>({
    url: endpoint,
    method,
    data: body,
    ...config,
  });
  return response.data;
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

export { apiClient };
