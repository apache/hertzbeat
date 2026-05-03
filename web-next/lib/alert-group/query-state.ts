export function buildAlertGroupUrl(search: string): string {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8', sort: 'id', order: 'desc' });
  if (search.trim()) params.set('search', search.trim());
  return `/alert/groups?${params.toString()}`;
}
