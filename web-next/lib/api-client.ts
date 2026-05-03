export function getAuthorizationToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('Authorization');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('refresh-token');
}

export function getCurrentLocale(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('hb.lang') || window.localStorage.getItem('layout.lang');
}

function setTokens(token?: string | null, refreshToken?: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem('Authorization', token);
  }
  if (refreshToken) {
    window.localStorage.setItem('refresh-token', refreshToken);
  }
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('Authorization');
  window.localStorage.removeItem('refresh-token');
}

function buildHeaders(extra?: Record<string, string>) {
  const token = getAuthorizationToken();
  const locale = getCurrentLocale();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(locale ? { 'Accept-Language': locale } : {}),
    ...(extra || {})
  };
}

async function refreshAuthorizationToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch('/api/account/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: refreshToken }),
      cache: 'no-store'
    });
    if (!response.ok) {
      clearTokens();
      return false;
    }
    const payload = (await response.json()) as {
      code: number;
      msg?: string;
      data?: { token?: string; refreshToken?: string };
    };
    if (payload.code !== 0 || !payload.data?.token) {
      clearTokens();
      return false;
    }
    setTokens(payload.data.token, payload.data.refreshToken ?? refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function apiFetch(path: string, init: RequestInit = {}, retryOn401 = true): Promise<Response> {
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...init,
    headers: buildHeaders(init.headers as Record<string, string> | undefined),
    cache: 'no-store'
  });

  if (response.status === 401 && retryOn401) {
    const refreshed = await refreshAuthorizationToken();
    if (refreshed) {
      return apiFetch(path, init, false);
    }
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

export async function apiMessageGet<T>(path: string): Promise<T> {
  const payload = await apiGet<{ code: number; msg?: string; data: T }>(path);
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'API message returned non-zero code');
  }
  return payload.data;
}

export async function apiMessagePost<T>(path: string, body: unknown): Promise<T> {
  const payload = await apiPost<{ code: number; msg?: string; data: T }>(path, body);
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'API message returned non-zero code');
  }
  return payload.data;
}

export async function apiMessagePut<T>(path: string, body: unknown): Promise<T> {
  const payload = await apiPut<{ code: number; msg?: string; data: T }>(path, body);
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'API message returned non-zero code');
  }
  return payload.data;
}

export async function apiMessageDelete<T>(path: string): Promise<T> {
  const payload = await apiDelete<{ code: number; msg?: string; data: T }>(path);
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'API message returned non-zero code');
  }
  return payload.data;
}
