/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const CSRF_COOKIE = 'hb_ui_csrf';
const CSRF_HEADER = 'X-HertzBeat-CSRF';
const SESSION_REFRESH_PATH = '/api/ui/session/refresh';
const REQUEST_TIMEOUT_MS = 30_000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type BrowserSessionRefreshOptions = {
  convergence: 'local-only';
};

export type BrowserSessionRefreshResult =
  | { status: 'renewed' }
  | { status: 'rejected' }
  | { status: 'uncertain'; failure: 'unavailable' | 'contract' | 'error' }
  | { status: 'retired' };

type BrowserSessionRefreshCoordinator = (
  options?: BrowserSessionRefreshOptions
) => Promise<BrowserSessionRefreshResult>;

let sessionRefreshCoordinator: BrowserSessionRefreshCoordinator | undefined;

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const request = withBrowserSession(init);
  const response = await fetchWithTimeout(input, request);
  const method = (request.method ?? 'GET').toUpperCase();

  if (response.status !== 401 || isSessionRefresh(input)) {
    return response;
  }
  const refreshed = await refreshBrowserSession();
  // A rejected mutation is never replayed automatically. Refresh still
  // converges the session identity so the caller does not remain in a stale
  // authenticated shell after revocation.
  if (!SAFE_METHODS.has(method) || !refreshed) return response;
  return fetchWithTimeout(input, request);
}

function isSessionRefresh(input: RequestInfo | URL) {
  const value = requestUrl(input);
  return value === SESSION_REFRESH_PATH || value.endsWith(SESSION_REFRESH_PATH);
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function withBrowserSession(init: RequestInit): RequestInit {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set(CSRF_HEADER, csrf);
  }
  return { ...init, method, headers, credentials: 'same-origin' };
}

export function refreshBrowserSession(options?: BrowserSessionRefreshOptions) {
  return refreshBrowserSessionResult(options).then(result => result.status === 'renewed');
}

export function refreshBrowserSessionResult(options?: BrowserSessionRefreshOptions) {
  return Promise.resolve()
    .then(
      () =>
        sessionRefreshCoordinator?.(options) ??
        ({ status: 'uncertain', failure: 'unavailable' } satisfies BrowserSessionRefreshResult)
    )
    .catch(() => ({ status: 'uncertain', failure: 'error' }) satisfies BrowserSessionRefreshResult);
}

/**
 * Installs the single application-level owner that can parse and publish a
 * refreshed session. The transport intentionally cannot maintain a second,
 * boolean-only identity beside the React Query session boundary.
 */
export function registerBrowserSessionRefreshCoordinator(coordinator: BrowserSessionRefreshCoordinator) {
  sessionRefreshCoordinator = coordinator;
  return () => {
    if (sessionRefreshCoordinator === coordinator) sessionRefreshCoordinator = undefined;
  };
}

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split('; ').find(value => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}
