/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
