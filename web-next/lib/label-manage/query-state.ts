export type LabelQueryState = {
  search: string;
  type: string;
};

export function buildLabelUrl(query: LabelQueryState): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.type.trim()) params.set('type', query.type.trim());
  return `/label?${params.toString()}`;
}
