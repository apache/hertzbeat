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
import type { LogExploreQuery } from './explore-query';
import type { ExploreDraftFieldUpdate, LogExploreSubmissionDraft } from './explore-submission-model';
import { readLogAnalysisDraft } from './explore-log-analysis';
import { searchFieldName } from './explore-log-search-authoring';
import { logInspectorFilterDisabledReason } from './explore-log-inspector-filter';
export function logComparisonFacetAction(
  draft: LogExploreSubmissionDraft,
  scope: LogExploreQuery,
  source: 'a' | 'b',
  field: LogFacetField,
  value: string,
  operator: '=' | '!='
): ExploreDraftFieldUpdate | undefined {
  const analysis = readLogAnalysisDraft(draft.logAnalysis);
  const comparison = analysis?.comparison;
  if (!analysis || !comparison) return undefined;
  const syntax = source === 'a' ? draft.searchSyntax : comparison.searchSyntax;
  const text = source === 'a' ? draft.query : comparison.search;
  if (!editableComparisonText(text, syntax, value)) return undefined;
  if (lockedFacet(draft, scope, field, value, operator)) return undefined;
  const name = searchFieldName(field);
  if (!name) return undefined;
  const search = appendFacet(text, name, value, operator);
  if (search.length > 8192) return undefined;
  return source === 'a'
    ? { field: 'query', value: search }
    : { field: 'logAnalysis', value: JSON.stringify({ ...analysis, comparison: { ...comparison, search } }) };
}

function editableComparisonText(text: string | undefined, syntax: string | undefined, value: string): text is string {
  return text !== undefined && syntax === 'structured-v1' && !/[\p{Cc}]/u.test(value);
}

function lockedFacet(
  draft: LogExploreSubmissionDraft,
  scope: LogExploreQuery,
  field: LogFacetField,
  value: string,
  operator: '=' | '!='
) {
  if (
    field.source !== 'builtin' &&
    logInspectorFilterDisabledReason(draft, { scope: field.source, key: field.key, value }, operator, scope) ===
      'scope-locked'
  )
    return true;
  return false;
}

function appendFacet(text: string, name: string, value: string, operator: '=' | '!=') {
  const clause = `${operator === '!=' ? '-' : ''}${name.replaceAll(':', '\\:')}:"${value.replace(/[\\"*]/gu, '\\$&')}"`;
  return text.trim() ? `(${text}) AND ${clause}` : clause;
}
