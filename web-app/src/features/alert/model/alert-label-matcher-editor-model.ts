/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type AlertLabelMatcherRow = { id: number; key: string; value: string };

export function alertLabelMatcherRowsFromValue(value: Record<string, string>): AlertLabelMatcherRow[] {
  const rows = Object.entries(value).map(([key, labelValue], index) => ({
    id: index + 1,
    key,
    value: labelValue
  }));
  return rows.length ? rows : [{ id: 1, key: '', value: '' }];
}

export function nextAlertLabelMatcherRowId(rows: AlertLabelMatcherRow[]) {
  return Math.max(0, ...rows.map(row => row.id)) + 1;
}

export function alertLabelMatcherMapFromRows(rows: AlertLabelMatcherRow[]) {
  return Object.fromEntries(
    rows.map(row => [row.key.trim(), row.value.trim()] as const).filter(([key, value]) => Boolean(key && value))
  );
}

/** Preserves incomplete authoring rows so form validation cannot silently discard visible input. */
export function serializeAlertLabelMatcherRows(rows: AlertLabelMatcherRow[]) {
  return rows.map(row => `${row.key.trim()}:${row.value.trim()}`).join(', ');
}

export function alertLabelMatcherOptions(options: string[], selected: string, search: string) {
  const values = [...new Set([...options, selected].filter(Boolean))];
  const custom = search.trim();
  const normalizedSearch = custom.toLowerCase();
  const filtered = custom ? values.filter(value => value.toLowerCase().includes(normalizedSearch)) : values;
  if (custom && !filtered.some(value => value.toLowerCase() === normalizedSearch)) filtered.push(custom);
  return filtered.map(value => ({ label: value, value }));
}

export function replaceAlertLabelMatcherRow(
  rows: AlertLabelMatcherRow[],
  index: number,
  replacement: AlertLabelMatcherRow
) {
  return rows.map((row, rowIndex) => (rowIndex === index ? replacement : row));
}

export function alertLabelMatcherMapSignature(value: Record<string, string>) {
  return JSON.stringify(Object.entries(value));
}
