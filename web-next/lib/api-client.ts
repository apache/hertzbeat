import { SUPPLEMENTAL_MESSAGES } from './i18n-runtime-messages';
import { clearClientSessionMarker } from './session-client';

const API_MESSAGE_NON_ZERO_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['common.api.message-nonzero'] ?? 'common.api.message-nonzero';
const API_REQUEST_FAILED_STATUS_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['common.api.request-failed-status'] ?? 'common.api.request-failed-status';

function formatApiRequestFailedStatus(status: number): string {
  return API_REQUEST_FAILED_STATUS_FALLBACK.replace('{{status}}', String(status));
}

export type ApiClientError = Error & {
  code?: number;
  status?: number;
};

export function getAuthorizationToken(): string | null {
  return null;
}

export function getCurrentLocale(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('hb.lang') || window.localStorage.getItem('layout.lang');
}

function buildHeaders(extra?: Record<string, string>) {
  const locale = getCurrentLocale();
  return {
    ...(locale ? { 'Accept-Language': locale } : {}),
    ...(extra || {})
  };
}

async function refreshAuthorizationToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/account/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) {
      clearClientSessionMarker();
      return false;
    }
    const payload = (await response.json()) as {
      code: number;
      msg?: string;
      data?: { authenticated?: boolean };
    };
    if (payload.code !== 0 || !payload.data?.authenticated) {
      clearClientSessionMarker();
      return false;
    }
    return true;
  } catch {
    clearClientSessionMarker();
    return false;
  }
}

async function apiFetch(path: string, init: RequestInit = {}, retryOn401 = true): Promise<Response> {
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...init,
    headers: buildHeaders(init.headers as Record<string, string> | undefined),
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (response.status === 401 && retryOn401) {
    const refreshed = await refreshAuthorizationToken();
    if (refreshed) {
      return apiFetch(path, init, false);
    }
  }

  if (!response.ok) {
    const error = new Error(formatApiRequestFailedStatus(response.status)) as ApiClientError;
    error.status = response.status;
    throw error;
  }
  return response;
}

export async function apiDownload(path: string, init: RequestInit = {}, retryOn401 = true): Promise<Response> {
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...init,
    headers: buildHeaders(init.headers as Record<string, string> | undefined),
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (response.status === 401 && retryOn401) {
    const refreshed = await refreshAuthorizationToken();
    if (refreshed) {
      return apiDownload(path, init, false);
    }
  }

  return response;
}

export async function apiGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await apiFetch(path, {
    method: 'POST',
    ...(isFormDataBody
      ? { body }
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await apiFetch(path, {
    method: 'DELETE',
  });
  return response.json() as Promise<T>;
}

export async function apiMessageGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const payload = await apiGet<{ code: number; msg?: string; data: T }>(path, init);
  if (payload.code !== 0) {
    const error = new Error(payload.msg || API_MESSAGE_NON_ZERO_FALLBACK) as ApiClientError;
    error.code = payload.code;
    throw error;
  }
  return payload.data;
}

export async function apiMessagePost<T>(path: string, body: unknown): Promise<T> {
  const payload = await apiPost<{ code: number; msg?: string; data: T }>(path, body);
  if (payload.code !== 0) {
    const error = new Error(payload.msg || API_MESSAGE_NON_ZERO_FALLBACK) as ApiClientError;
    error.code = payload.code;
    throw error;
  }
  return payload.data;
}

export async function apiMessagePut<T>(path: string, body: unknown): Promise<T> {
  const payload = await apiPut<{ code: number; msg?: string; data: T }>(path, body);
  if (payload.code !== 0) {
    const error = new Error(payload.msg || API_MESSAGE_NON_ZERO_FALLBACK) as ApiClientError;
    error.code = payload.code;
    throw error;
  }
  return payload.data;
}

export async function apiMessageDelete<T>(path: string): Promise<T> {
  const payload = await apiDelete<{ code: number; msg?: string; data: T }>(path);
  if (payload.code !== 0) {
    const error = new Error(payload.msg || API_MESSAGE_NON_ZERO_FALLBACK) as ApiClientError;
    error.code = payload.code;
    throw error;
  }
  return payload.data;
}
