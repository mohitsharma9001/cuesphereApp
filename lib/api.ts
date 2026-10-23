import { API_BASE } from './config';
import { storage } from './storage';

const ACCESS_KEY = 'cs_access';
const REFRESH_KEY = 'cs_refresh';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

let tokens: Tokens | null = null;
let refreshing: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

/** Loads saved tokens at startup. */
export async function loadTokens(): Promise<Tokens | null> {
  const [accessToken, refreshToken] = await Promise.all([storage.get(ACCESS_KEY), storage.get(REFRESH_KEY)]);
  tokens = accessToken && refreshToken ? { accessToken, refreshToken } : null;
  return tokens;
}

export async function saveTokens(next: Tokens | null) {
  tokens = next;
  await Promise.all([storage.set(ACCESS_KEY, next?.accessToken ?? null), storage.set(REFRESH_KEY, next?.refreshToken ?? null)]);
}

export function hasTokens() {
  return tokens !== null;
}

/** Called when the refresh token is rejected, so the app can drop to signed-out. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/** Swaps the refresh token for a new pair. Concurrent 401s share one refresh. */
async function refreshTokens(): Promise<boolean> {
  if (!tokens) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens?.refreshToken }),
      });
      if (!res.ok) {
        await saveTokens(null);
        onSessionExpired?.();
        return false;
      }
      await saveTokens((await res.json()).data as Tokens);
      return true;
    } catch {
      return false; // offline — keep the tokens and try again later
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

/** Calls the CueSphere API: sends the access token, refreshes it once on 401,
 * unwraps `{ success, data }`, and throws ApiError with the API's message. */
export async function api<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  const { method = 'GET', body, query } = options;
  const qs = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ''}`, {
      method,
      // The API also sets cookies; the app authenticates only with the Bearer token.
      credentials: 'omit',
      headers: {
        accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
        ...(tokens ? { authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach CueSphere. Check your connection.");
  }

  if (res.status === 401 && tokens && !retried && (await refreshTokens())) {
    return api<T>(path, options, true);
  }

  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: T; message?: string } | null;
  if (!res.ok || json?.success === false) {
    throw new ApiError(res.status, json?.message ?? `Request failed (${res.status})`);
  }
  return json?.data as T;
}
