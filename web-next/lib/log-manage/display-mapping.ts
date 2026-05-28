import type { LogEntry } from '@/lib/types';

export type LogSeverityTone = 'danger' | 'warning' | 'success' | 'neutral';

export function severityLabel(entry: Partial<LogEntry>): string {
  return entry.severityText || (entry.severityNumber != null ? String(entry.severityNumber) : 'LOG');
}

export function logSeverityTone(severity?: string | number | null): LogSeverityTone {
  if (severity == null) return 'neutral';
  const normalized = String(severity).trim().toUpperCase();
  if (!normalized) return 'neutral';

  const numericSeverity = /^\d+$/.test(normalized) ? Number(normalized) : undefined;
  if (numericSeverity != null) {
    if (numericSeverity >= 17) return 'danger';
    if (numericSeverity >= 13) return 'warning';
    if (numericSeverity >= 9) return 'success';
    return 'neutral';
  }

  if (normalized.includes('ERROR') || normalized.includes('FATAL')) return 'danger';
  if (normalized.includes('WARN')) return 'warning';
  if (normalized.includes('INFO')) return 'success';
  return 'neutral';
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
