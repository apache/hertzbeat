import { stripReturnLabelFromHref } from '../signal-route-context';

export type LoginTokens = {
  token: string;
  refreshToken: string;
};

export const DEFAULT_LOGIN_ENTRY_PATH = '/passport/login';
export const LOGIN_REDIRECT_QUERY_KEY = 'redirect';

export type LoginMessage = {
  code?: number;
  msg?: string;
  data?: Partial<LoginTokens>;
};

type StorageLike = {
  setItem: (key: string, value: string) => void;
};

type LocationLike = {
  pathname?: string | null;
  search?: string | null;
  hash?: string | null;
};

type ApiGetter = <T>(path: string) => Promise<T>;

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

export function persistLoginTokens(storage: StorageLike, tokens: LoginTokens) {
  storage.setItem('Authorization', tokens.token);
  storage.setItem('refresh-token', tokens.refreshToken);
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

export function resolvePostLoginRedirectTarget(returnTo?: string | null, fallback = '/overview') {
  return sanitizeLoginRedirectTarget(returnTo) || fallback;
}

export async function bootstrapPostLoginSession(apiGet: ApiGetter) {
  await Promise.allSettled([
    apiGet('/config/system')
  ]);
}
