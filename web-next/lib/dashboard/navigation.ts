import { buildCompatRedirectTarget, type SearchParamsRecord } from '../compat/search-params';

export function buildDashboardCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildCompatRedirectTarget('/overview', searchParams);
}
