export type PluginQueryState = {
  search: string;
  pageIndex?: number;
  pageSize?: number;
};

export function buildPluginUrl(query: PluginQueryState): string {
  const pageIndex = Number.isFinite(query.pageIndex) ? Math.max(0, Math.trunc(query.pageIndex ?? 0)) : 0;
  const pageSize = Number.isFinite(query.pageSize) ? Math.max(1, Math.trunc(query.pageSize ?? 8)) : 8;
  const params = new URLSearchParams({ pageIndex: String(pageIndex), pageSize: String(pageSize) });
  if (query.search.trim()) params.set('search', query.search.trim());
  return `/plugin?${params.toString()}`;
}
