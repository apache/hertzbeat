import type { AuthToken } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiDeleter = <T>(url: string) => Promise<T>;
type RawTokenResponse = { code: number; msg?: string; data?: { token?: string } };
type RawMessageResponse = { code: number; msg?: string };

export async function loadTokenData(apiGet: ApiGetter) {
  const tokens = await apiGet<AuthToken[]>('/account/token');
  return { tokens };
}

export function buildGenerateTokenUrl(name: string, expireSeconds: string) {
  const params = new URLSearchParams({ name: name.trim() });
  const expireValue = Number(expireSeconds);
  if (!Number.isNaN(expireValue)) params.set('expireSeconds', String(expireValue));
  return `/account/token/generate?${params.toString()}`;
}

export async function generateTokenValue(apiGet: ApiGetter, name: string, expireSeconds: string, failureMessage: string) {
  const message = await apiGet<RawTokenResponse>(buildGenerateTokenUrl(name, expireSeconds));
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
