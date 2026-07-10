import { buildCompatRedirectTarget, type SearchParamsRecord } from '../compat/search-params';

export type { SearchParamsRecord } from '../compat/search-params';

export const SETTING_CONFIG_ROUTE = '/setting/settings/config';
export const SETTING_SERVER_ROUTE = '/setting/settings/server';
export const SETTING_OBJECT_STORE_ROUTE = '/setting/settings/object-store';
export const SETTING_TOKEN_ROUTE = '/setting/settings/token';

function firstSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function normalizeSettingsRouteHint(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, '-');
}

export function resolveSettingsCompatRoute(searchParams?: SearchParamsRecord) {
  const hints = [
    firstSearchParamValue(searchParams?.section),
    firstSearchParamValue(searchParams?.tab),
    firstSearchParamValue(searchParams?.focus)
  ].map(normalizeSettingsRouteHint);

  if (hints.some(hint => ['server', 'message', 'message-server', 'smtp', 'sms'].includes(hint))) {
    return SETTING_SERVER_ROUTE;
  }
  if (hints.some(hint => ['object-store', 'objectstore', 'storage', 'oss'].includes(hint))) {
    return SETTING_OBJECT_STORE_ROUTE;
  }
  if (hints.some(hint => ['token', 'tokens', 'api-token', 'api-tokens'].includes(hint))) {
    return SETTING_TOKEN_ROUTE;
  }
  return SETTING_CONFIG_ROUTE;
}

export function buildSettingsCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildCompatRedirectTarget(resolveSettingsCompatRoute(searchParams), searchParams);
}
