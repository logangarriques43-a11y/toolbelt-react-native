/**
 * API client — fetch wrapper over the backend (same host as the Swift app).
 *
 * - Prepends API_BASE_URL.
 * - Attaches the Firebase ID token as `Authorization: Bearer <token>`.
 * - Unwraps the response defensively: some domains return `{ status, data }`,
 *   others (e.g. /clients) return bare JSON — `json.data ?? json` handles both.
 * - Maps errors to a typed ApiError (401 unauthorized, 403 2fa_required, other).
 *
 * TEMPORARY: logs each request + response status in __DEV__ so the create/list
 * flow is visible in the console. Remove the console.log lines once verified.
 */

import { API_BASE_URL } from '@/config/api';
import { auth } from '@/lib/firebase';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  body?: unknown;
  query?: Query;
}

function buildUrl(path: string, query?: Query): string {
  let url = API_BASE_URL + path;
  if (query) {
    // Manual query string — RN's URL/URLSearchParams support is inconsistent.
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += (path.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  const token = await auth.currentUser?.getIdToken();

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  if (__DEV__) console.log(`[api] → ${method} ${path}`, opts.body ?? '', token ? '(auth)' : '(NO TOKEN)');

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    if (__DEV__) console.log(`[api] ✗ ${method} ${path} network error`, e);
    throw new ApiError(0, e instanceof Error ? e.message : 'Network request failed', 'network');
  }

  const text = await res.text();
  const json = text ? safeParse(text) : null;

  if (__DEV__) console.log(`[api] ← ${method} ${path} ${res.status}`, json ?? text);

  if (!res.ok) {
    if (res.status === 401) throw new ApiError(401, 'Unauthorized — please sign in again.', 'unauthorized', json);
    if (res.status === 403 && (json as { code?: string })?.code === '2fa_required') {
      throw new ApiError(403, 'Two-factor authentication required.', '2fa_required', json);
    }
    const msg =
      (json as { message?: string; error?: string })?.message ||
      (json as { error?: string })?.error ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, undefined, json);
  }

  // Envelope-agnostic: unwrap `.data` when present, else return the bare body.
  const payload = (json as { data?: unknown })?.data ?? json;
  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  del: <T = void>(path: string) => request<T>('DELETE', path),
};
