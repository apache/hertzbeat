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

import { parseLogCalculatedV2, type LogCalculatedV2 } from '@/shared/log-calculated-v2';
export { parseLogCalculatedV2 } from '@/shared/log-calculated-v2';
export type { LogCalculatedV2 } from '@/shared/log-calculated-v2';
import { validLogAnalysis } from '@/platform/perses';
import {
  calculatedAnalysisFields,
  validCalculatedQueryContext,
  validCalculatedSort
} from './explore-log-calculated-analysis-state';
import { validLogTransactionQuery } from './explore-log-transactions';
import { readLogSort } from './explore-log-order';
import { validLogSubqueryQuery } from './explore-log-subquery';

export function validLogCalculatedV2(raw: string | undefined) {
  return raw === undefined || parseLogCalculatedV2(raw) !== undefined;
}

export function appendCalculatedFormula(raw: string | undefined, name: string, expression: string) {
  const state =
    raw === undefined
      ? { version: 2 as const, nextFieldSeq: 1, fields: [] as LogCalculatedV2['fields'] }
      : parseLogCalculatedV2(raw);
  if (!state || state.nextFieldSeq > 9999 || state.fields.length >= 8) return undefined;
  const next = {
    version: 2 as const,
    nextFieldSeq: state.nextFieldSeq + 1,
    fields: [...state.fields, { id: `c${state.nextFieldSeq}`, kind: 'formula' as const, name, expression }]
  };
  return parseLogCalculatedV2(JSON.stringify(next)) ? JSON.stringify(next) : undefined;
}

export function appendCalculatedExtraction(
  raw: string | undefined,
  engine: 'regex' | 'grok',
  source: string,
  pattern: string,
  names: string[]
) {
  const state =
    raw === undefined
      ? { version: 2 as const, nextFieldSeq: 1, fields: [] as LogCalculatedV2['fields'] }
      : parseLogCalculatedV2(raw);
  if (!state || state.nextFieldSeq > 9999 || state.fields.length >= 8) return undefined;
  const next = {
    version: 2 as const,
    nextFieldSeq: state.nextFieldSeq + 1,
    fields: [
      ...state.fields,
      {
        id: `c${state.nextFieldSeq}`,
        kind: 'extraction' as const,
        engine,
        source,
        pattern,
        captures: names.map(name => ({ name }))
      }
    ]
  };
  return parseLogCalculatedV2(JSON.stringify(next)) ? JSON.stringify(next) : undefined;
}

export function updateCalculatedExtraction(
  raw: string | undefined,
  fieldId: string,
  engine: 'regex' | 'grok',
  source: string,
  pattern: string,
  names: string[],
  search = '',
  sort?: string,
  analysis?: string
) {
  const state = parseLogCalculatedV2(raw);
  const old = state?.fields.find(field => field.id === fieldId && field.kind === 'extraction');
  if (!state || old?.kind !== 'extraction') return undefined;
  const expressions = state.fields.flatMap(field => (field.kind === 'formula' ? [field.expression] : []));
  const removed = old.captures.map(capture => capture.name).filter(name => !names.includes(name));
  if (
    removed.some(
      name =>
        [search, ...expressions].some(value => replaceReference(value, name, name).found) ||
        readLogSort(sort)?.field === `calculated:${name}` ||
        calculatedAnalysisFields(analysis).includes(`calculated:${name}`)
    )
  )
    return undefined;
  const next = {
    ...state,
    fields: state.fields.map(field =>
      field.id === fieldId
        ? { id: fieldId, kind: 'extraction' as const, engine, source, pattern, captures: names.map(name => ({ name })) }
        : field
    )
  };
  return parseLogCalculatedV2(JSON.stringify(next)) ? JSON.stringify(next) : undefined;
}

export function updateCalculatedFormula(
  raw: string | undefined,
  fieldId: string,
  name: string,
  expression: string,
  search = '',
  sort?: string,
  analysis?: string
) {
  const state = parseLogCalculatedV2(raw);
  const old = state?.fields.find(field => field.id === fieldId && field.kind === 'formula');
  if (
    !state ||
    old?.kind !== 'formula' ||
    (name !== old.name &&
      (replaceReference(search, old.name, name).found ||
        readLogSort(sort)?.field === `calculated:${old.name}` ||
        calculatedAnalysisFields(analysis).includes(`calculated:${old.name}`)))
  )
    return undefined;
  const next = {
    ...state,
    fields: state.fields.map(field =>
      field.kind === 'formula'
        ? {
            ...field,
            ...(field.id === fieldId ? { name } : {}),
            expression: replaceReference(field.id === fieldId ? expression : field.expression, old.name, name).text
          }
        : field
    )
  };
  return parseLogCalculatedV2(JSON.stringify(next)) ? JSON.stringify(next) : undefined;
}

export function removeCalculatedField(
  raw: string | undefined,
  fieldId: string,
  search: string,
  sort?: string,
  analysis?: string
): { blocked: boolean; raw?: string | undefined } {
  const state = parseLogCalculatedV2(raw);
  const target = state?.fields.find(field => field.id === fieldId);
  if (!state || !target) return { blocked: true };
  const names = target.kind === 'formula' ? [target.name] : target.captures.map(capture => capture.name);
  const otherExpressions = state.fields.flatMap(field =>
    field.id !== fieldId && field.kind === 'formula' ? [field.expression] : []
  );
  const referenced = names.some(name =>
    [search, ...otherExpressions].some(value => replaceReference(value, name, name).found)
  );
  if (
    referenced ||
    names.some(
      name =>
        readLogSort(sort)?.field === `calculated:${name}` ||
        calculatedAnalysisFields(analysis).includes(`calculated:${name}`)
    )
  )
    return { blocked: true };
  const fields = state.fields.filter(field => field.id !== fieldId);
  return { blocked: false, raw: fields.length ? JSON.stringify({ ...state, fields }) : undefined };
}

function replaceReference(text: string, oldName: string, newName: string) {
  let found = false;
  const value = text.replace(/"(?:\\.|[^"\\])*"|\\.|#[A-Za-z][A-Za-z0-9_]*/gu, token => {
    if (token !== `#${oldName}`) return token;
    found = true;
    return `#${newName}`;
  });
  return { text: value, found };
}

export function validLogCalculatedV2Query(query: {
  logCalculatedV2?: string | undefined;
  logCalculated?: string | undefined;
  logAggregation?: string | undefined;
  logAnalysis?: string | undefined;
  searchSyntax?: string | undefined;
  logSort?: string | undefined;
}) {
  const sort = readLogSort(query.logSort);
  if (query.logCalculatedV2 === undefined)
    return (
      query.searchSyntax !== 'structured-v2' &&
      !sort?.field.startsWith('calculated:') &&
      validLogAnalysis(query.logAnalysis) &&
      !calculatedAnalysisFields(query.logAnalysis).length
    );
  const definitions = parseLogCalculatedV2(query.logCalculatedV2);
  if (!definitions) return false;
  const names = definitions.fields.flatMap(field =>
    field.kind === 'formula' ? [field.name] : field.captures.map(capture => capture.name)
  );
  if (!validCalculatedSort(names, sort?.field)) return false;
  return validCalculatedQueryContext(query, names);
}

export function validLogExploreModes(
  query: Parameters<typeof validLogTransactionQuery>[0] &
    Parameters<typeof validLogCalculatedV2Query>[0] & { logReferenceJoin?: string | undefined }
) {
  return (
    validLogTransactionQuery(query) &&
    validLogCalculatedV2Query(query) &&
    validLogSubqueryQuery(query) &&
    query.logReferenceJoin === undefined
  );
}
