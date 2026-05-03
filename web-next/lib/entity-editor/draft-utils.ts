export type KeyValueDraft = { key: string; value: string };

export function uniqueSuggestions(values?: string[]) {
  return Array.from(new Set((values || []).filter(Boolean))).slice(0, 8);
}

export function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function toKeyValueDraft(record?: Record<string, string>): KeyValueDraft[] {
  const entries = Object.entries(record || {});
  return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];
}

export function fromKeyValueDraft(rows: KeyValueDraft[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const key = row.key.trim();
    if (!key) return acc;
    acc[key] = row.value.trim();
    return acc;
  }, {});
}

export function normalizeTags(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
