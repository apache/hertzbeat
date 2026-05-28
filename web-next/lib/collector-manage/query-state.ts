export type CollectorQueryState = {
  pageIndex: number;
  pageSize: number;
  search: string;
};

export function buildCollectorUrl(query: CollectorQueryState): string {
  const pageIndex = Number.isFinite(query.pageIndex) ? Math.max(0, Math.trunc(query.pageIndex)) : 0;
  const pageSize = Number.isFinite(query.pageSize) ? Math.max(1, Math.trunc(query.pageSize)) : 8;
  const params = new URLSearchParams({ pageIndex: String(pageIndex), pageSize: String(pageSize) });
  if (query.search.trim()) params.set('name', query.search.trim());
  return `/collector?${params.toString()}`;
}
