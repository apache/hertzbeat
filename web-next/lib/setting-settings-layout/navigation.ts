import { buildCompatRedirectTarget, type SearchParamsRecord } from '../compat/search-params';

export type { SearchParamsRecord } from '../compat/search-params';

export const SETTING_CONFIG_ROUTE = '/setting/settings/config';

export function buildSettingsCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildCompatRedirectTarget(SETTING_CONFIG_ROUTE, searchParams);
}
