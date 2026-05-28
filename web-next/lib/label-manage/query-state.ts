export type LabelQueryState = {
  search: string;
  type: string;
};

export const LABEL_MANAGE_ANGULAR_PAGE_SIZE = 9999;

export function buildLabelUrl(query: LabelQueryState): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: String(LABEL_MANAGE_ANGULAR_PAGE_SIZE) });
  if (query.type.trim()) params.set('type', query.type.trim());
  if (query.search.trim()) params.set('search', query.search.trim());
  return `/label?${params.toString()}`;
}
