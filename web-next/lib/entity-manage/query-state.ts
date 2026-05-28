import {
  buildCompatRedirectTarget,
  createCompatSearchParamReader,
  type SearchParamsRecord
} from '../compat/search-params';

export type { SearchParamsRecord } from '../compat/search-params';

export const ENTITY_LIST_ROUTE = '/entities';

export type EntityListSearchParams = SearchParamsRecord;

export type EntityQueryState = {
  search: string;
  type: string;
  status: string;
};

export type SearchParamReader = {
  get: (key: string) => string | null;
};

export function queryStateFromParams(params: SearchParamReader): EntityQueryState {
  return {
    search: params.get('search') || '',
    type: params.get('type') || '',
    status: params.get('status') || '',
  };
}

export function readEntityListQueryState(searchParams: EntityListSearchParams = {}): EntityQueryState {
  return queryStateFromParams(createCompatSearchParamReader(searchParams));
}

export function buildEntityUrl(query: EntityQueryState): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8', sort: 'gmtUpdate', order: 'desc' });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.type.trim()) params.set('type', query.type.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  return `${ENTITY_LIST_ROUTE}?${params.toString()}`;
}

export function buildEntityListCompatRouteUrl(searchParams?: SearchParamsRecord): string {
  return buildCompatRedirectTarget(ENTITY_LIST_ROUTE, searchParams);
}

export function queryStateToQueryString(query: EntityQueryState): string {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.type.trim()) params.set('type', query.type.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  return params.toString();
}
