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
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let refreshRequest: Promise<boolean> | undefined;

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const request = withBrowserSession(init);
  const response = await fetch(input, request);
  const method = (request.method ?? 'GET').toUpperCase();

  if (response.status !== 401 || !SAFE_METHODS.has(method) || isSessionRefresh(input)) {
    return response;
  }
  if (!(await refreshBrowserSession())) return response;
  return fetch(input, request);
}

function isSessionRefresh(input: RequestInfo | URL) {
  const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return value === SESSION_REFRESH_PATH || value.endsWith(SESSION_REFRESH_PATH);
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

export function refreshBrowserSession() {
  if (!refreshRequest) {
    refreshRequest = fetch(SESSION_REFRESH_PATH, withBrowserSession({ method: 'POST' }))
      .then(response => response.ok)
      .finally(() => {
        refreshRequest = undefined;
      });
  }
  return refreshRequest;
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split('; ').find(value => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}
