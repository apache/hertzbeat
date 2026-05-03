export function statusTone(status?: string | null): 'danger' | 'warning' | 'success' | undefined {
  if (!status) return undefined;
  const upper = status.toUpperCase();
  if (upper.includes('ERROR')) return 'danger';
  if (upper.includes('UNSET')) return 'warning';
  return 'success';
}

export function attributeRows(attributes?: Record<string, string>, fallbackTitle = 'attribute') {
  return Object.entries(attributes || {})
    .slice(0, 5)
    .map(([key, value]) => ({
      title: key || fallbackTitle,
      copy: value || '-',
      meta: 'attribute'
    }));
}
