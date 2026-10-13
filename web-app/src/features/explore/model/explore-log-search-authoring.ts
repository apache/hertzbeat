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

import type { LogFacetField } from './explore-log-facets';
export type SearchCompletionContext = { start: number; end: number; prefix: string; field?: string };
export type LogSearchSuggestion = {
  value: string;
  label: string;
  count?: number;
  fieldValue: boolean;
  condition?: string;
  insertion?: string;
};
export type LogSearchSuggestions = {
  field?: string | undefined;
  state: 'idle' | 'loading' | 'ready' | 'unavailable';
  options: LogSearchSuggestion[];
  requestField: (field: string | undefined, prefix?: string) => void;
};
const builtinNames: Record<string, string> = { serviceName: 'service', environment: 'env', severityCategory: 'status' };
export function searchFieldName(field: LogFacetField) {
  return field.source === 'builtin'
    ? builtinNames[field.key]
    : `${field.source === 'resource' ? 'resource.' : '@'}${field.key.replaceAll(':', '\\:')}`;
}
// This is caret token detection, not grammar validation. The backend remains authoritative.
export function searchCompletionContext(text: string, caret: number): SearchCompletionContext | null {
  // Collection predicates have no scalar-facet completion. Preserve the whole expression rather than guess its grammar.
  if (hasCollectionMarker(text)) return null;
  const start = tokenStart(text, caret);
  if (start === null) return null;
  let end = caret;
  while (end < text.length && !/[\s()]/u.test(text[end]!)) end++;
  const token = text.slice(start, caret);
  const colon = token.indexOf(':');
  if (/["\\]/u.test(text.slice(start, end))) return null;
  return colon < 0
    ? { start, end, prefix: token }
    : { start: start + colon + 1, end, prefix: token.slice(colon + 1), field: token.slice(0, colon) };
}
export function insertSearchCompletion(
  text: string,
  context: SearchCompletionContext,
  value: string,
  fieldValue: boolean,
  insertion?: string
) {
  const insert = insertion ?? (fieldValue ? `"${value.replace(/[\\"*]/gu, '\\$&')}"` : `${value}:`);
  return {
    text: text.slice(0, context.start) + insert + text.slice(context.end),
    caret: context.start + insert.length
  };
}

export function searchSuggestionCondition(field: string, value: string) {
  return `${field}:"${value.replace(/[\\"*]/gu, '\\$&')}"`;
}

function tokenStart(text: string, caret: number) {
  const state = scanSearchPrefix(text, caret);
  return state.quoted || state.escaped ? null : state.start;
}

export function hasUnclosedSearchQuote(text: string) {
  return scanSearchPrefix(text, text.length).quoted;
}

function scanSearchPrefix(text: string, caret: number) {
  let quoted = false;
  let escaped = false;
  let start = 0;
  for (let index = 0; index < caret; index++) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') quoted = !quoted;
    if (!quoted && /[\s()]/u.test(char ?? '')) start = index + 1;
  }
  return { quoted, escaped, start };
}

function hasCollectionMarker(text: string) {
  // Skip quoted text and escaped characters; this recognizes a marker, not a search grammar.
  for (const token of text.matchAll(/"(?:\\.|[^"\\])*(?:"|$)|\\.|(\[\s*\]\s*:)/gu)) {
    if (token[1]) return true;
  }
  return false;
}
