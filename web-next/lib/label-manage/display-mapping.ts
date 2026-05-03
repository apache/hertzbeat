export function labelTypeLabel(type?: number | null): string {
  if (type === 0) return 'auto';
  if (type === 1) return 'user';
  if (type === 2) return 'preset';
  return '-';
}
