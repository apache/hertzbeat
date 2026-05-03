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

export function buildEntityUrl(query: EntityQueryState): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8', sort: 'gmtUpdate', order: 'desc' });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.type.trim()) params.set('type', query.type.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  return `/entities?${params.toString()}`;
}

export function queryStateToQueryString(query: EntityQueryState): string {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.type.trim()) params.set('type', query.type.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  return params.toString();
}
