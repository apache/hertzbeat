/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logFacetFieldSchema } from '@/shared/log-field';
import { parseLogAnalysis } from '@/platform/perses';

export type LogSubquery = {
  version: 1;
  mainField: string;
  operator: 'in' | 'not_in';
  child: { field: string; searchSyntax: 'structured-v1'; search: string };
  rank: {
    direction: 'top' | 'bottom';
    limit: number;
    measure: { function: 'count_all' } | { function: 'count_distinct'; field: string };
  };
};
export type LogSubqueryContext = { logSubquery?: string | undefined };

export function parseLogSubquery(raw: string | undefined): LogSubquery | undefined {
  if (raw === undefined || new TextEncoder().encode(raw).byteLength > 32768) return undefined;
  try {
    const value = JSON.parse(raw) as LogSubquery;
    return validDescriptor(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function validDescriptor(value: LogSubquery) {
  return Boolean(
    value &&
    Object.keys(value).sort().join() === 'child,mainField,operator,rank,version' &&
    value.version === 1 &&
    validField(value.mainField) &&
    ['in', 'not_in'].includes(value.operator) &&
    validChild(value.child) &&
    validRank(value.rank)
  );
}

function validChild(child: LogSubquery['child']) {
  return Boolean(
    child &&
    Object.keys(child).sort().join() === 'field,search,searchSyntax' &&
    validField(child.field) &&
    child.searchSyntax === 'structured-v1' &&
    typeof child.search === 'string' &&
    new TextEncoder().encode(child.search).byteLength <= 8192
  );
}

function validRank(rank: LogSubquery['rank']) {
  return Boolean(
    rank &&
    Object.keys(rank).sort().join() === 'direction,limit,measure' &&
    ['top', 'bottom'].includes(rank.direction) &&
    Number.isInteger(rank.limit) &&
    rank.limit >= 1 &&
    rank.limit <= 1000 &&
    validMeasure(rank.measure)
  );
}

function validMeasure(measure: LogSubquery['rank']['measure']) {
  if (measure.function === 'count_all') return Object.keys(measure).join() === 'function';
  return Object.keys(measure).sort().join() === 'field,function' && validField(measure.field);
}

export function defaultLogSubquery(): LogSubquery {
  return {
    version: 1,
    mainField: 'builtin:serviceName',
    operator: 'in',
    child: { field: 'builtin:serviceName', searchSyntax: 'structured-v1', search: '' },
    rank: { direction: 'top', limit: 10, measure: { function: 'count_all' } }
  };
}

export function readDraftSubquery(raw: string): LogSubquery {
  try {
    const value = JSON.parse(raw) as LogSubquery;
    return value?.version === 1 && value.child && value.rank ? value : defaultLogSubquery();
  } catch {
    return defaultLogSubquery();
  }
}

export function validLogSubqueryQuery(query: {
  logSubquery?: string | undefined;
  searchSyntax?: string | undefined;
  logAnalysis?: string | undefined;
  logCalculatedV2?: string | undefined;
  logCalculated?: string | undefined;
  logTransactions?: string | undefined;
  logAggregation?: string | undefined;
  live?: boolean | undefined;
  logRecordUid?: string | undefined;
}) {
  if (query.logSubquery === undefined) return true;
  return Boolean(parseLogSubquery(query.logSubquery) && compatibleMode(query) && validAnalysis(query.logAnalysis));
}

function compatibleMode(query: Parameters<typeof validLogSubqueryQuery>[0]) {
  return (
    query.searchSyntax === 'structured-v1' &&
    absentOptionalValue(query.logCalculatedV2) &&
    absentOptionalValue(query.logCalculated) &&
    absentOptionalValue(query.logTransactions) &&
    !query.live &&
    !query.logRecordUid &&
    (absentOptionalValue(query.logAggregation) || query.logAggregation === 'fields')
  );
}

function absentOptionalValue(value: string | undefined) {
  return value === undefined || value === '';
}

function validAnalysis(raw: string | undefined) {
  try {
    const analysis = raw ? parseLogAnalysis(raw) : undefined;
    return (
      !analysis?.comparison && !analysis?.querySet && !analysis?.additionalMeasures?.length && !analysis?.transform
    );
  } catch {
    return false;
  }
}

function validField(field: unknown) {
  if (typeof field !== 'string') return false;
  const separator = field.indexOf(':');
  return logFacetFieldSchema.safeParse({
    id: field,
    source: field.slice(0, separator),
    key: field.slice(separator + 1)
  }).success;
}
