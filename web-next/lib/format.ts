export function formatTime(value?: number | string | null): string {
  if (value == null) return '-';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function formatDurationNanos(value?: number | null): string {
  if (value == null) return '-';
  const ms = value / 1_000_000;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms >= 1) return `${ms.toFixed(0)}ms`;
  const micros = value / 1_000;
  if (micros >= 1) return `${micros.toFixed(0)}μs`;
  return `${value}ns`;
}

export function bodyText(value: unknown): string {
  if (value == null) return '-';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
