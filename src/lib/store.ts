import { writable, type Writable } from 'svelte/store';

const AUTH_TOKEN_KEY = 'authToken';
const isBrowser = typeof window !== 'undefined';

function readStoredAuthToken(): string | null {
  if (!isBrowser) return null;

  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (legacyToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return legacyToken;
  }

  return null;
}

function persistAuthToken(token: string | null): void {
  if (!isBrowser) return;

  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export const authToken: Writable<string | null> = writable(readStoredAuthToken());
authToken.subscribe((value) => {
  persistAuthToken(value);
});

export function getStoredAuthToken(): string | null {
  if (!isBrowser) return null;
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearStoredAuthToken(): void {
  if (!isBrowser) return;
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

type Theme = 'light' | 'dark' | 'system';
const storedTheme = isBrowser ? (localStorage.getItem('theme') as Theme | null) : null;
export const theme: Writable<Theme> = writable(storedTheme || 'system');
theme.subscribe(value => {
    if (!isBrowser) return;
    localStorage.setItem('theme', value);
});
