import type { AuthToken } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, body: unknown) => Promise<T>;
type ApiDeleter = <T>(url: string) => Promise<T>;
type RawTokenResponse = { code: number; msg?: string; data?: { token?: string } };
type RawMessageResponse = { code: number; msg?: string };
export type TokenScope = 'api-admin' | 'readonly-query' | 'otlp-ingest';

export type GenerateTokenOptions = {
  scope?: string | null;
  workspaceId?: string | null;
};

export const DEFAULT_TOKEN_SCOPE: TokenScope = 'api-admin';
export const TOKEN_SCOPES: TokenScope[] = ['api-admin', 'otlp-ingest', 'readonly-query'];

export async function loadTokenData(apiGet: ApiGetter) {
  const tokens = await apiGet<AuthToken[]>('/account/token');
  return { tokens };
}

export function normalizeTokenScope(scope: string | null | undefined): TokenScope {
  const normalized = scope?.trim().toLowerCase();
  return TOKEN_SCOPES.includes(normalized as TokenScope) ? normalized as TokenScope : DEFAULT_TOKEN_SCOPE;
}

export function buildGenerateTokenUrl(name: string, expireSeconds: string, options: GenerateTokenOptions = {}) {
  const params = new URLSearchParams({ name: name.trim() });
  const expireValue = Number(expireSeconds);
  if (!Number.isNaN(expireValue)) params.set('expireSeconds', String(expireValue));
  if (options.scope) params.set('scope', normalizeTokenScope(options.scope));
  const workspaceId = options.workspaceId?.trim();
  if (workspaceId) params.set('workspaceId', workspaceId);
  return `/account/token/generate?${params.toString()}`;
}

export async function generateTokenValue(
  apiPost: ApiPoster,
  name: string,
  expireSeconds: string,
  failureMessage: string,
  options: GenerateTokenOptions = {}
) {
  const message = await apiPost<RawTokenResponse>(buildGenerateTokenUrl(name, expireSeconds, options), {});
  if (message.code !== 0) {
    throw new Error(message.msg || failureMessage);
  }
  return message.data?.token || '';
}

export async function deleteTokenById(apiDelete: ApiDeleter, id: number | string, failureMessage: string) {
  const message = await apiDelete<RawMessageResponse>(`/account/token/${id}`);
  if (message.code !== 0) {
    throw new Error(message.msg || failureMessage);
  }
}
