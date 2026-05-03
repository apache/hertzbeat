export type CollectorQueryState = {
  search: string;
};

export function buildCollectorUrl(query: CollectorQueryState): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
  if (query.search.trim()) params.set('name', query.search.trim());
  return `/collector?${params.toString()}`;
}
