/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFilterClause } from './explore-log-filter-expression';
export function quoteTraceFacetValue(value: string): string | undefined {
  if (!value || value.trim() !== value || /[\p{Cc}\\]/u.test(value) || reservedTraceValue(value)) return undefined;
  const quote = value.includes('"') ? "'" : '"';
  return value.includes(quote) ? undefined : `${quote}${value}${quote}`;
}
export function traceClauseValues(clause: LogFilterClause): string[] | undefined {
  if (clause.operator === 'EXISTS' || clause.operator === 'NOT EXISTS') return [];
  if (clause.operator !== 'IN' && clause.operator !== 'NOT IN') {
    const value = literal(clause.value);
    return value === undefined ? undefined : [value];
  }
  return listValues(clause.value.slice(1, -1));
}
function listValues(inner: string): string[] | undefined {
  const items: string[] = [];
  let start = 0,
    quote = '';
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index]!;
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === ',') {
      items.push(inner.slice(start, index).trim());
      start = index + 1;
    }
  }
  items.push(inner.slice(start).trim());
  const values = items.map(literal);
  return quote || values.some(value => value === undefined) ? undefined : (values as string[]);
}
function literal(raw: string): string | undefined {
  if (raw.startsWith('"') || raw.startsWith("'")) {
    const quote = raw[0]!;
    if (!raw.endsWith(quote) || raw.length < 3) return undefined;
    const value = raw.slice(1, -1);
    return value.includes(quote) || !quoteTraceFacetValue(value) ? undefined : value;
  }
  return /^[A-Za-z0-9_.:/@+-]+$/u.test(raw) && quoteTraceFacetValue(raw) ? raw : undefined;
}

function reservedTraceValue(value: string) {
  return (
    ['__hz_exists__', '__hz_not_exists__'].includes(value) ||
    ['__hz_contains__:', '__hz_not_contains__:'].some(prefix => value.startsWith(prefix))
  );
}
