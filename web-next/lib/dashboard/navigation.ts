import { buildOverviewCompatRouteUrl, type SearchParamsRecord } from '../overview/navigation';

export type { SearchParamsRecord };

export function buildDashboardCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildOverviewCompatRouteUrl(searchParams);
}
