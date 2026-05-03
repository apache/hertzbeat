export function ensureObjectRows<T extends object>(rows: T[]) {
  return rows.length > 0 ? rows : [{} as T];
}

export function updateObjectArrayItem<T extends object>(rows: T[], index: number, patch: Partial<T>) {
  return rows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

export function addObjectRow<T extends object>(rows: T[]) {
  return [...rows, {} as T];
}

export function removeObjectArrayItem<T extends object>(rows: T[], index: number) {
  return rows.length === 1 ? ([{}] as T[]) : rows.filter((_, itemIndex) => itemIndex !== index);
}

export function ensureJsonRows(rows: string[]) {
  return rows.length > 0 ? rows : ['{}'];
}

export function updateJsonRow(rows: string[], index: number, value: string) {
  return rows.map((entry, entryIndex) => (entryIndex === index ? value : entry));
}

export function addJsonRow(rows: string[]) {
  return [...rows, '{}'];
}

export function removeJsonRow(rows: string[], index: number) {
  return rows.length === 1 ? ['{}'] : rows.filter((_, entryIndex) => entryIndex !== index);
}
