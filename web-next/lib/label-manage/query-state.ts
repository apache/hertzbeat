export type LabelQueryState = {
  search: string;
  type: string;
};

export const LABEL_MANAGE_ANGULAR_PAGE_SIZE = 9999;
const LABEL_QUERY_TYPE_VALUES = new Set(['0', '1', '2']);

export function normalizeLabelQueryType(type: string): string {
  const trimmed = type.trim();
  return LABEL_QUERY_TYPE_VALUES.has(trimmed) ? trimmed : '';
}

export function buildLabelUrl(query: LabelQueryState): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: String(LABEL_MANAGE_ANGULAR_PAGE_SIZE) });
  const type = normalizeLabelQueryType(query.type);
  if (type) params.set('type', type);
  if (query.search.trim()) params.set('search', query.search.trim());
  return `/label?${params.toString()}`;
}
