export function buildBulletinListUrl(search: string): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
  if (search.trim()) params.set('search', search.trim());
  return `/bulletin?${params.toString()}`;
}

export function applyBulletinSearch(search: string) {
  return search.trim();
}

export function resetBulletinSearchState() {
  return {
    search: '',
    query: ''
  };
}
