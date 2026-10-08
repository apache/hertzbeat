/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFacetField } from './explore-log-facets';
import type { LogExploreQuery } from './explore-query';
import type { LogExploreSubmissionDraft } from './explore-submission-types';
import { searchFieldName } from './explore-log-search-authoring';
import { structuredFacetGuard } from './explore-log-structured-facet-guard';

type Action = {
  selected: boolean;
  update?: { field: 'query'; value: string };
  reason?: 'legacy-value';
};

// Selection is a small compatibility grammar over simple top-level facet clauses.
// eslint-disable-next-line complexity
export function structuredFacetAction(
  draft: LogExploreSubmissionDraft,
  scope: LogExploreQuery,
  field: LogFacetField | undefined,
  value: string,
  operator: '=' | '!=',
  intent: 'single' | 'toggle',
  fieldName?: string
): Action {
  const blocked = field ? structuredFacetGuard(draft, scope, field, value, operator) : undefined;
  if (blocked) return blocked;
  const name = fieldName ?? (field ? searchFieldName(field) : undefined);
  if (!name) return { selected: false };
  const search = draft.query ?? '';
  const included = findSimpleFacet(search, name);
  const excluded = findSimpleFacet(search, `-${name}`);
  const invertToggle = operator === '=' && intent === 'toggle' && !included;
  if (invertToggle && !excluded && search.includes(`${name}:`)) return { selected: false };
  const clauseField = operator === '!=' || invertToggle ? `-${name}` : name;
  const existing =
    operator === '=' && intent === 'single' ? (included ?? excluded) : findSimpleFacet(search, clauseField);
  const values = existing?.values ?? [];
  const sameValue = (candidate: string) =>
    name === 'status' ? candidate.toUpperCase() === value.toUpperCase() : candidate === value;
  const matched = values.some(sameValue);
  const selected =
    intent === 'single' && operator === '='
      ? Boolean(included?.values.length === 1 && !excluded && included.values.some(sameValue))
      : invertToggle
        ? !matched
        : matched;
  const nextValues =
    intent === 'single' && operator === '='
      ? [value]
      : matched
        ? values.filter(item => !sameValue(item))
        : [...values, value];
  if (intent === 'single' && selected && values.length === 1 && !excluded && included)
    return {
      selected: true,
      update: { field: 'query', value: replaceFacet(search, included.start, included.end, '') }
    };
  const query = editFacetQuery({
    search,
    name,
    clauseField,
    existing,
    nextValues,
    matched,
    sameValue,
    single: intent === 'single' && operator === '='
  });
  if (query === undefined || query.length > 8192) return { selected: false };
  return { selected, update: { field: 'query', value: query } };
}

type SimpleFacet = { start: number; end: number; values: string[] };

export function withoutSimpleFacetField(search: string, field: string) {
  let remaining = search;
  for (let index = 0; index < 100; index += 1) {
    const clause = findSimpleFacet(remaining, field) ?? findSimpleFacet(remaining, `-${field}`);
    if (!clause) break;
    remaining = replaceFacet(remaining, clause.start, clause.end, '');
  }
  return remaining;
}
type FacetEdit = {
  search: string;
  name: string;
  clauseField: string;
  existing: SimpleFacet | undefined;
  nextValues: string[];
  matched: boolean;
  sameValue: (candidate: string) => boolean;
  single: boolean;
};

// eslint-disable-next-line complexity
function editFacetQuery({ search, name, clauseField, existing, nextValues, matched, sameValue, single }: FacetEdit) {
  const clause = nextValues.length
    ? `${clauseField}:${nextValues.length === 1 ? JSON.stringify(nextValues[0]) : `(${nextValues.map(item => JSON.stringify(item)).join(' OR ')})`}`
    : '';
  let query = existing
    ? replaceFacet(search, existing.start, existing.end, clause)
    : appendStructuredClause(search, clause);
  if (matched && !nextValues.length) {
    for (let index = 0; index < 100; index += 1) {
      const duplicate = findSimpleFacet(query, clauseField);
      if (!duplicate || !duplicate.values.some(sameValue)) break;
      const remaining = duplicate.values.filter(item => !sameValue(item));
      const replacement = remaining.length
        ? `${clauseField}:${remaining.length === 1 ? JSON.stringify(remaining[0]) : `(${remaining.map(item => JSON.stringify(item)).join(' OR ')})`}`
        : '';
      query = replaceFacet(query, duplicate.start, duplicate.end, replacement);
    }
  }
  if (single) {
    for (let index = 0; index < 100; index += 1) {
      const excludedClause = findSimpleFacet(query, `-${name}`);
      if (!excludedClause) break;
      query = replaceFacet(query, excludedClause.start, excludedClause.end, '');
    }
  }
  return !clause && !existing ? undefined : query;
}

function findSimpleFacet(query: string, field: string): SimpleFacet | undefined {
  if (needsFacetGroup(query)) return undefined;
  let found: SimpleFacet | undefined;
  scanTopLevel(query, index => {
    if (found || (index > 0 && !/\s/u.test(query[index - 1]!)) || !query.startsWith(`${field}:`, index)) return 0;
    const start = index + field.length + 1;
    const tail = query.slice(start);
    const match =
      /^(\((?:"(?:\\.|[^"\\])*"|[A-Za-z0-9_.-]+)(?:\s+OR\s+(?:"(?:\\.|[^"\\])*"|[A-Za-z0-9_.-]+))+\)|"(?:\\.|[^"\\])*"|[A-Za-z0-9_.-]+)/u.exec(
        tail
      );
    if (!match) return 0;
    const raw = match[0];
    if (tail[raw.length] && !/[\s)]/u.test(tail[raw.length]!)) return 0;
    const tokens = raw.startsWith('(')
      ? (raw.slice(1, -1).match(/"(?:\\.|[^"\\])*"|[A-Za-z0-9_.-]+/gu) ?? []).filter(token => token !== 'OR')
      : [raw];
    try {
      found = {
        start: index,
        end: start + raw.length,
        values: tokens.map(token => (token.startsWith('"') ? (JSON.parse(token) as string) : token))
      };
    } catch {
      return 0;
    }
    return 0;
  });
  return found;
}

function needsFacetGroup(query: string) {
  return hasUnquotedEscape(query) || hasTopLevelOr(query) || /(?:^|\s)(?:and|or)(?:\s|$)/u.test(query);
}

export function appendStructuredClause(search: string, clause: string) {
  const text = search.trim();
  return text ? `${needsFacetGroup(text) ? `(${text})` : text} AND ${clause}` : clause;
}

function replaceFacet(query: string, start: number, end: number, clause: string) {
  if (clause) return query.slice(0, start) + clause + query.slice(end);
  let before = query.slice(0, start).trimEnd();
  let after = query.slice(end).trimStart();
  if (/(?:^|\s)AND$/u.test(before)) before = before.replace(/(?:^|\s)AND$/u, '').trimEnd();
  else if (after.startsWith('AND ')) after = after.slice(4).trimStart();
  return [before, after].filter(Boolean).join(' ');
}
function hasUnquotedEscape(text: string) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      if (!quoted && text[index + 1] !== ':') return true;
      escaped = true;
    } else if (char === '"') quoted = !quoted;
  }
  return false;
}

export function splitTopLevelAnd(text: string) {
  const parts: string[] = [];
  let start = 0;
  scanTopLevel(text, index => {
    if (!text.startsWith(' AND ', index)) return 0;
    parts.push(text.slice(start, index).trim());
    start = index + 5;
    return 5;
  });
  parts.push(text.slice(start).trim());
  return parts;
}

function hasTopLevelOr(text: string) {
  let found = false;
  scanTopLevel(text, index => {
    if (
      !text.startsWith('OR', index) ||
      (index > 0 && !/[\s)]/u.test(text[index - 1]!)) ||
      (text[index + 2] && !/[\s(]/u.test(text[index + 2]!))
    )
      return 0;
    found = true;
    return 0;
  });
  return found;
}

function scanTopLevel(text: string, visit: (index: number) => number) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0) {
      const skip = visit(index);
      if (skip > 0) index += skip - 1;
    }
  }
}
