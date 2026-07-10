import { NextRequest, NextResponse } from 'next/server';

export const HB_UI_ACCESS_COOKIE = 'hb_ui_access';
export const HB_UI_REFRESH_COOKIE = 'hb_ui_refresh';
export const HB_UI_SESSION_MARKER_COOKIE = 'hb_ui_session';

type ApiPayload = {
  code?: number;
  msg?: string;
  data?: Record<string, unknown> | null;
};

type SessionTokens = {
  token?: string;
  refreshToken?: string;
};

type CookieSecurityContext = Pick<NextRequest, 'headers' | 'url'> | string | URL | undefined;

const DEFAULT_BACKEND_ORIGIN = 'http://127.0.0.1:1157';
const ACCESS_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const BACKEND_UNAVAILABLE_MESSAGE = 'Backend service unavailable. Please retry after the backend service is restored.';

function normalizeCookieSecureOverride() {
  const value = process.env.HB_UI_COOKIE_SECURE?.trim().toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return null;
}

function resolveCookieRequestUrl(context: CookieSecurityContext) {
  if (!context) return null;
  if (typeof context === 'string') return new URL(context);
  if (context instanceof URL) return context;
  return new URL(context.url);
}

function resolveCookieHost(context: CookieSecurityContext, requestUrl: URL | null) {
  if (context && typeof context !== 'string' && !(context instanceof URL)) {
    return context.headers.get('x-forwarded-host') || context.headers.get('host') || requestUrl?.host || '';
  }
  return requestUrl?.host || '';
}

function isLocalCookieHost(host: string) {
  const hostname = host.split(':')[0]?.replace(/^\[|\]$/g, '').toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function shouldUseSecureCookies(context?: CookieSecurityContext) {
  const override = normalizeCookieSecureOverride();
  if (override !== null) return override;

  const requestUrl = resolveCookieRequestUrl(context);
  const forwardedProto = context && typeof context !== 'string' && !(context instanceof URL)
    ? context.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
    : null;
  const protocol = forwardedProto || requestUrl?.protocol.replace(':', '') || '';
  if (protocol === 'https') return true;
  if (isLocalCookieHost(resolveCookieHost(context, requestUrl))) return false;
  return process.env.NODE_ENV === 'production';
}

function baseCookieOptions(maxAge: number, context?: CookieSecurityContext) {
  return {
    sameSite: 'lax' as const,
    secure: shouldUseSecureCookies(context),
    path: '/',
    maxAge
  };
}

function secretCookieOptions(maxAge: number, context?: CookieSecurityContext) {
  return {
    ...baseCookieOptions(maxAge, context),
    httpOnly: true
  };
}

function markerCookieOptions(maxAge: number, context?: CookieSecurityContext) {
  return {
    ...baseCookieOptions(maxAge, context),
    httpOnly: false
  };
}

function readCookieHeaderValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  for (const segment of cookieHeader.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const rawValue = trimmed.slice(prefix.length);
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      return rawValue.slice(1, -1);
    }
    return rawValue;
  }
  return undefined;
}

export function readSessionCookieValue(request: Pick<NextRequest, 'cookies' | 'headers'>, name: string) {
  return request.cookies.get(name)?.value ?? readCookieHeaderValue(request.headers.get('cookie'), name);
}

export function resolveBackendOrigin() {
  return process.env.BACKEND_ORIGIN?.trim() || DEFAULT_BACKEND_ORIGIN;
}

export function buildBackendApiUrl(path: string, search = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${resolveBackendOrigin()}/api${cleanPath}${search}`;
}

export function sanitizeSessionPayload(payload: ApiPayload): ApiPayload {
  if (!payload.data || typeof payload.data !== 'object') {
    return payload;
  }
  const { token: _token, refreshToken: _refreshToken, ...rest } = payload.data;
  return {
    ...payload,
    data: {
      ...rest,
      authenticated: payload.code === 0,
      tokenBoundary: 'bff-cookie'
    }
  };
}

export function applySessionCookies(response: NextResponse, tokens: SessionTokens, context?: CookieSecurityContext) {
  if (tokens.token) {
    response.cookies.set(HB_UI_ACCESS_COOKIE, tokens.token, secretCookieOptions(ACCESS_MAX_AGE_SECONDS, context));
  }
  if (tokens.refreshToken) {
    response.cookies.set(HB_UI_REFRESH_COOKIE, tokens.refreshToken, secretCookieOptions(REFRESH_MAX_AGE_SECONDS, context));
  }
  if (tokens.token || tokens.refreshToken) {
    response.cookies.set(HB_UI_SESSION_MARKER_COOKIE, '1', markerCookieOptions(REFRESH_MAX_AGE_SECONDS, context));
  }
}

export function clearSessionCookies(response: NextResponse, context?: CookieSecurityContext) {
  [HB_UI_ACCESS_COOKIE, HB_UI_REFRESH_COOKIE, HB_UI_SESSION_MARKER_COOKIE].forEach(name => {
    const options = name === HB_UI_SESSION_MARKER_COOKIE ? markerCookieOptions(0, context) : secretCookieOptions(0, context);
    response.cookies.set(name, '', options);
  });
}

function copyProxyHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  return headers;
}

function copyResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete('content-encoding');
  nextHeaders.delete('content-length');
  nextHeaders.delete('transfer-encoding');
  nextHeaders.delete('www-authenticate');
  nextHeaders.delete('proxy-authenticate');
  return nextHeaders;
}

async function readProxyBody(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }
  return request.arrayBuffer();
}

async function refreshSessionTokens(request: NextRequest): Promise<SessionTokens | null> {
  const refreshToken = readSessionCookieValue(request, HB_UI_REFRESH_COOKIE);
  if (!refreshToken) {
    return null;
  }

  const upstream = await fetch(buildBackendApiUrl('/account/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('Accept-Language') ? { 'Accept-Language': request.headers.get('Accept-Language') as string } : {})
    },
    body: JSON.stringify({ token: refreshToken }),
    cache: 'no-store'
  });
  const payload = await readJsonPayload(upstream);
  if (!upstream.ok || payload.code !== 0 || !payload.data || typeof payload.data.token !== 'string') {
    return null;
  }

  return {
    token: payload.data.token,
    refreshToken: typeof payload.data.refreshToken === 'string' ? payload.data.refreshToken : refreshToken
  };
}

export async function proxyBackendApiRequest(request: NextRequest, path: string) {
  const requestUrl = new URL(request.url);
  const body = await readProxyBody(request);
  const accessToken = readSessionCookieValue(request, HB_UI_ACCESS_COOKIE);

  const fetchUpstream = (token?: string) => {
    const headers = copyProxyHeaders(request);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(buildBackendApiUrl(path, requestUrl.search), {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store'
    });
  };

  try {
    let upstream = await fetchUpstream(accessToken);
    let refreshedTokens: SessionTokens | null = null;
    if (upstream.status === 401) {
      refreshedTokens = await refreshSessionTokens(request);
      if (refreshedTokens?.token) {
        upstream = await fetchUpstream(refreshedTokens.token);
      }
    }

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream.headers)
    });
    if (refreshedTokens?.token && upstream.ok) {
      applySessionCookies(response, refreshedTokens, request);
    } else if (upstream.status === 401 && readSessionCookieValue(request, HB_UI_REFRESH_COOKIE)) {
      clearSessionCookies(response, request);
    }
    return response;
  } catch {
    return NextResponse.json(
      {
        code: 503,
        msg: BACKEND_UNAVAILABLE_MESSAGE,
        data: null
      },
      { status: 503 }
    );
  }
}

export async function readJsonPayload(response: Response): Promise<ApiPayload> {
  try {
    return (await response.json()) as ApiPayload;
  } catch {
    return { code: response.ok ? 0 : response.status, msg: response.statusText, data: null };
  }
}
