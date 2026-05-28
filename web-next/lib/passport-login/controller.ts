import { buildCompatRedirectTarget, createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { stripReturnLabelFromHref } from '../signal-route-context';

export type { SearchParamsRecord } from '../compat/search-params';

export type LoginTokens = {
  token: string;
  refreshToken: string;
};

export type PostLoginSessionUser = {
  name: string;
  avatar: string;
  email: string;
  role?: string;
};

export type PassportLoginSearchParams = SearchParamsRecord;

export type PassportLoginRouteState = {
  redirectTarget: string;
};

export const DEFAULT_LOGIN_ENTRY_PATH = '/passport/login';
export const LOGIN_REDIRECT_QUERY_KEY = 'redirect';
export const POST_LOGIN_STARTUP_FAILURE_PATH = '/exception/500';

export function buildLoginCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildCompatRedirectTarget(DEFAULT_LOGIN_ENTRY_PATH, searchParams);
}

export type LoginMessage = {
  code?: number;
  msg?: string;
  data?: Partial<LoginTokens> & {
    authenticated?: boolean;
    tokenBoundary?: string;
    role?: unknown;
  };
};

type LocationLike = {
  pathname?: string | null;
  search?: string | null;
  hash?: string | null;
};

type ApiGetter = <T>(path: string) => Promise<T>;

type SystemConfigPayload = {
  code?: number;
  data?: {
    locale?: unknown;
  } | null;
};

export function buildLoginRequestBody(identifier: string, credential: string) {
  return {
    type: 0,
    identifier,
    credential
  };
}

export function resolveLoginError(status: number, message: LoginMessage, fallback: string) {
  return message.msg || fallback.replace('{{status}}', String(status));
}

export function assertLoginSuccess(status: number, message: LoginMessage, fallback: string): LoginTokens {
  if (status >= 400 || message.code !== 0 || !message.data?.token || !message.data?.refreshToken) {
    throw new Error(resolveLoginError(status, message, fallback));
  }

  return {
    token: message.data.token,
    refreshToken: message.data.refreshToken
  };
}

export function assertSessionLoginSuccess(status: number, message: LoginMessage, fallback: string) {
  if (status >= 400 || message.code !== 0) {
    throw new Error(resolveLoginError(status, message, fallback));
  }
}

export function buildPostLoginSessionUser(identifier: string, message: LoginMessage): PostLoginSessionUser {
  const name = identifier || 'admin';
  const role = typeof message.data?.role === 'string' && message.data.role.trim()
    ? message.data.role.trim()
    : undefined;

  return {
    name,
    avatar: './assets/img/avatar.svg',
    email: 'administrator',
    ...(role ? { role } : {})
  };
}

export function sanitizeLoginRedirectTarget(value?: string | null) {
  const nextValue = stripReturnLabelFromHref(value)?.trim();
  if (!nextValue) return null;
  if (!nextValue.startsWith('/')) return null;
  if (nextValue.startsWith('//')) return null;
  if (nextValue.includes('://')) return null;
  if (/^\/(?:passport(?:\/|$)|login(?:\/|$))/.test(nextValue)) return null;
  return nextValue;
}

export function buildLoginReturnTo(location: LocationLike) {
  const pathname = location.pathname?.trim() || '';
  const search = location.search || '';
  const hash = location.hash || '';
  return sanitizeLoginRedirectTarget(`${pathname}${search}${hash}`);
}

export function resolveLoginEntryPath(loginPath?: string | null) {
  const nextValue = loginPath?.trim();
  if (nextValue === DEFAULT_LOGIN_ENTRY_PATH || nextValue === '/login') {
    return nextValue;
  }

  return DEFAULT_LOGIN_ENTRY_PATH;
}

export function buildLoginRedirectHref(returnTo?: string | null, loginPath?: string | null) {
  const resolvedLoginPath = resolveLoginEntryPath(loginPath);
  const normalizedTarget = sanitizeLoginRedirectTarget(returnTo);
  if (!normalizedTarget) {
    return resolvedLoginPath;
  }

  const params = new URLSearchParams({ [LOGIN_REDIRECT_QUERY_KEY]: normalizedTarget });
  return `${resolvedLoginPath}?${params.toString()}`;
}

export function resolvePostLoginRedirectTarget(returnTo?: string | null, fallback = '/') {
  return sanitizeLoginRedirectTarget(returnTo) || fallback;
}

export function resolvePostLoginStartupFailureTarget() {
  return POST_LOGIN_STARTUP_FAILURE_PATH;
}

export function readPassportLoginRouteState(searchParams?: PassportLoginSearchParams): PassportLoginRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  return {
    redirectTarget: resolvePostLoginRedirectTarget(reader.get(LOGIN_REDIRECT_QUERY_KEY))
  };
}

function normalizeStartupLocale(locale: unknown, fallback = 'en-US') {
  if (typeof locale !== 'string') return fallback;
  const nextLocale = locale.trim().replace('_', '-');
  return nextLocale || fallback;
}

export async function bootstrapPostLoginSession(apiGet: ApiGetter, fallbackLocale = 'en-US') {
  let configPayload: SystemConfigPayload | null = null;
  try {
    configPayload = await apiGet<SystemConfigPayload>('/config/system');
  } catch {
    configPayload = null;
  }
  const startupLocale = normalizeStartupLocale(configPayload?.data?.locale, fallbackLocale);

  await apiGet(`/apps/hierarchy?lang=${encodeURIComponent(startupLocale)}`);
}
