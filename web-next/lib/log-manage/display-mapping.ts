import type { LogEntry } from '@/lib/types';

export function severityLabel(entry: Partial<LogEntry>): string {
  return entry.severityText || (entry.severityNumber != null ? String(entry.severityNumber) : 'LOG');
}

export function attributeRows(record?: Record<string, unknown>, label = 'attribute') {
  return Object.entries(record || {})
    .slice(0, 8)
    .map(([key, value]) => ({
      title: key,
      copy: typeof value === 'string' ? value : JSON.stringify(value),
      meta: label
    }));
}
