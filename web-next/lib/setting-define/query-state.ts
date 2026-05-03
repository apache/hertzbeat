export function normalizeDefineSearch(search: string): string | undefined {
  const normalized = search.trim();
  if (!normalized) return undefined;
  return encodeURIComponent(JSON.stringify([normalized]));
}

export function buildDefineListUrl(search: string): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8', sort: 'id', order: 'desc' });
  const payload = normalizeDefineSearch(search);
  const baseQuery = params.toString();
  return payload ? `/alert/defines?${baseQuery}&search=${payload}` : `/alert/defines?${baseQuery}`;
}
