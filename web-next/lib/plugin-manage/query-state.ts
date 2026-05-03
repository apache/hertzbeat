export type PluginQueryState = {
  search: string;
};

export function buildPluginUrl(query: PluginQueryState): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
  if (query.search.trim()) params.set('search', query.search.trim());
  return `/plugin?${params.toString()}`;
}
