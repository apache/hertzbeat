/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type AlertRulePreviewValue =
  string | number | boolean | null | AlertRulePreviewValue[] | { [key: string]: AlertRulePreviewValue };

export type AlertRulePreviewRow = Record<string, AlertRulePreviewValue>;

export type AlertRulePreview = {
  rowCount: number;
  rows: AlertRulePreviewRow[];
};

export const alertRulePreviewPageSize = 10;
// Preview rows remain intact as evidence; these limits only bound table presentation work.
export const alertRulePreviewMaxVisibleColumns = 50;
export const alertRulePreviewMaxCellCharacters = 500;
export const alertRulePreviewMaxValueDepth = 6;
export const alertRulePreviewMaxCollectionItems = 50;

export type AlertRulePreviewFormattedValue = {
  text: string;
  truncated: boolean;
};

export function alertRulePreviewColumns(rows: AlertRulePreviewRow[]) {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const column in row) {
      if (!Object.prototype.hasOwnProperty.call(row, column)) continue;
      columns.add(column);
      if (columns.size >= alertRulePreviewMaxVisibleColumns) return [...columns];
    }
  }
  return [...columns];
}

export function formatAlertRulePreviewValue(value: AlertRulePreviewValue | undefined) {
  return formatAlertRulePreviewValueResult(value).text;
}

// Backend query values are untrusted: never stringify the full value and truncate afterward.
// Character, depth, and collection budgets must apply during traversal while preserving parseable summaries.
export function formatAlertRulePreviewValueResult(
  value: AlertRulePreviewValue | undefined
): AlertRulePreviewFormattedValue {
  if (value === undefined) return { text: '', truncated: false };
  if (typeof value === 'string') return formatPlainText(value, alertRulePreviewMaxCellCharacters);
  return formatJsonSummary(value, alertRulePreviewMaxCellCharacters, 0);
}

export function alertRulePreviewHasPresentationTruncation(evidence: AlertRulePreview) {
  const visibleColumns = alertRulePreviewColumns(evidence.rows);
  const columns = new Set<string>();
  for (const row of evidence.rows) {
    for (const column in row) {
      if (!Object.prototype.hasOwnProperty.call(row, column)) continue;
      columns.add(column);
      if (columns.size > visibleColumns.length) return true;
    }
  }
  return evidence.rows.some(row =>
    visibleColumns.some(column => formatAlertRulePreviewValueResult(row[column]).truncated)
  );
}

const jsonEllipsis = '"…"';
const jsonObjectEllipsis = '"…":"…"';

function formatPlainText(value: string, budget: number): AlertRulePreviewFormattedValue {
  if (value.length <= budget) return { text: value, truncated: false };
  let text = '';
  for (const character of value) {
    if (text.length + character.length >= budget) break;
    text += character;
  }
  return { text: `${text}…`, truncated: true };
}

function formatJsonSummary(
  value: AlertRulePreviewValue,
  budget: number,
  depth: number
): AlertRulePreviewFormattedValue {
  if (budget < jsonEllipsis.length) return { text: '0', truncated: true };
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value);
    return text.length <= budget ? { text, truncated: false } : { text: jsonEllipsis, truncated: true };
  }
  if (typeof value === 'string') return quoteJsonString(value, budget);
  if (depth >= alertRulePreviewMaxValueDepth) return { text: jsonEllipsis, truncated: true };
  return Array.isArray(value) ? formatJsonArray(value, budget, depth) : formatJsonObject(value, budget, depth);
}

function formatJsonArray(
  value: AlertRulePreviewValue[],
  budget: number,
  depth: number
): AlertRulePreviewFormattedValue {
  if (budget < jsonEllipsis.length + 2) return { text: jsonEllipsis, truncated: true };
  const parts: string[] = [];
  let nestedTruncated = false;
  const visibleItems = Math.min(value.length, alertRulePreviewMaxCollectionItems);
  for (let index = 0; index < visibleItems; index += 1) {
    const reserve = index + 1 < value.length ? collectionPartLength(parts, jsonEllipsis) : 0;
    const available = budget - 2 - joinedLength(parts) - reserve - (parts.length > 0 ? 1 : 0);
    if (available < jsonEllipsis.length) break;
    const item = formatJsonSummary(value[index] as AlertRulePreviewValue, available, depth + 1);
    parts.push(item.text);
    nestedTruncated ||= item.truncated;
  }
  const omitted = parts.length < value.length;
  if (omitted) appendCollectionEllipsis(parts, jsonEllipsis, budget - 2);
  return { text: `[${parts.join(',')}]`, truncated: nestedTruncated || omitted };
}

function formatJsonObject(
  value: { [key: string]: AlertRulePreviewValue },
  budget: number,
  depth: number
): AlertRulePreviewFormattedValue {
  if (budget < jsonObjectEllipsis.length + 2) return { text: jsonEllipsis, truncated: true };
  const boundedEntries = boundedObjectEntries(value);
  const entries = boundedEntries.entries;
  const parts: string[] = [];
  let nestedTruncated = false;
  for (let index = 0; index < entries.length; index += 1) {
    const hasMore = index + 1 < entries.length || boundedEntries.hasMore;
    const reserve = hasMore ? collectionPartLength(parts, jsonObjectEllipsis) : 0;
    const available = budget - 2 - joinedLength(parts) - reserve - (parts.length > 0 ? 1 : 0);
    if (available < jsonObjectEllipsis.length) break;
    const [key, itemValue] = entries[index] as [string, AlertRulePreviewValue];
    const item = formatJsonProperty(key, itemValue, available, depth);
    parts.push(item.text);
    nestedTruncated ||= item.truncated;
  }
  const omitted = parts.length < entries.length || boundedEntries.hasMore;
  if (omitted) appendCollectionEllipsis(parts, jsonObjectEllipsis, budget - 2);
  return { text: `{${parts.join(',')}}`, truncated: nestedTruncated || omitted };
}

function formatJsonProperty(
  key: string,
  value: AlertRulePreviewValue,
  budget: number,
  depth: number
): AlertRulePreviewFormattedValue {
  const keyBudget = Math.max(jsonEllipsis.length, Math.min(80, budget - jsonEllipsis.length - 1));
  const formattedKey = quoteJsonString(key, keyBudget);
  const valueBudget = budget - formattedKey.text.length - 1;
  if (valueBudget < jsonEllipsis.length) return { text: jsonObjectEllipsis, truncated: true };
  const formattedValue = formatJsonSummary(value, valueBudget, depth + 1);
  return {
    text: `${formattedKey.text}:${formattedValue.text}`,
    truncated: formattedKey.truncated || formattedValue.truncated
  };
}

function quoteJsonString(value: string, budget: number): AlertRulePreviewFormattedValue {
  if (budget < jsonEllipsis.length) return { text: '""', truncated: true };
  const fragments: string[] = [];
  let contentLength = 0;
  let truncated = false;
  for (const character of value) {
    const fragment = JSON.stringify(character).slice(1, -1);
    if (contentLength + fragment.length > budget - 2) {
      truncated = true;
      break;
    }
    fragments.push(fragment);
    contentLength += fragment.length;
  }
  if (truncated) {
    while (contentLength + 1 > budget - 2 && fragments.length > 0) {
      contentLength -= fragments.pop()?.length ?? 0;
    }
    fragments.push('…');
  }
  return { text: `"${fragments.join('')}"`, truncated };
}

function appendCollectionEllipsis(parts: string[], marker: string, contentBudget: number) {
  while (joinedLength(parts) + collectionPartLength(parts, marker) > contentBudget && parts.length > 0) {
    parts.pop();
  }
  if (marker.length <= contentBudget) parts.push(marker);
}

function joinedLength(parts: string[]) {
  return parts.reduce((length, part) => length + part.length, Math.max(0, parts.length - 1));
}

function collectionPartLength(parts: string[], part: string) {
  return part.length + (parts.length > 0 ? 1 : 0);
}

function boundedObjectEntries(value: { [key: string]: AlertRulePreviewValue }) {
  const entries: Array<[string, AlertRulePreviewValue]> = [];
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (entries.length >= alertRulePreviewMaxCollectionItems) return { entries, hasMore: true };
    entries.push([key, value[key] as AlertRulePreviewValue]);
  }
  return { entries, hasMore: false };
}
