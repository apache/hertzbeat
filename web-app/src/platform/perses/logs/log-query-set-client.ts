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

import type { ExactTimeWindow } from '@/shared/query-context';
import { ExploreSignalContractError } from '@/shared/signal-contract-error';
import { apiMessagePostWithErrorEnvelope } from '@/core/http/api-message';
import type { LogAnalysisState } from './log-analysis';
import { logIntervalSchema, matchesLogInterval } from './log-interval';
import { shiftedLogWindow } from './log-timeshift';
import { validLogQuerySet, type LogQuerySource } from './log-query-set';
import { logQuerySetResultSchema } from './log-query-set-result';
import { sameLogMeasure } from './log-measure';
import { sameLogGrouping } from './log-grouping';

const SOURCE_PARAMETERS = ['search', 'searchSyntax', 'logSort', 'sort', 'pageIndex', 'pageSize'];
const ANALYSIS_PARAMETERS = [
  'field',
  'grouping',
  'measure',
  'additionalMeasures',
  'limit',
  'order',
  'minCount',
  'transform'
];

export function logQuerySetRequest(scope: URLSearchParams, window: ExactTimeWindow, state: LogAnalysisState) {
  const querySet = state.querySet;
  if (!querySet || !validLogQuerySet(querySet) || state.representation !== 'timeseries')
    throw new ExploreSignalContractError();
  if (querySet.queries.some(query => !shiftedLogWindow(window, query.timeShiftMs || undefined)))
    throw new ExploreSignalContractError();
  const params = new URLSearchParams(scope);
  for (const name of [...SOURCE_PARAMETERS, ...ANALYSIS_PARAMETERS]) params.delete(name);
  params.set('view', 'timeseries');
  if (state.intervalMs !== undefined) {
    if (!logIntervalSchema.safeParse(state.intervalMs).success) throw new ExploreSignalContractError();
    params.set('intervalMs', String(state.intervalMs));
  }
  const request = {
    version: 2 as const,
    parameters: Object.fromEntries(params),
    queries: querySet.queries,
    formulas: querySet.formulas.map(({ refId, alias, visible, expression }) => ({ refId, alias, visible, expression }))
  };
  if (JSON.stringify(request).length > 32768) throw new ExploreSignalContractError();
  return request;
}

export async function loadLogQuerySet(
  request: ReturnType<typeof logQuerySetRequest>,
  window: ExactTimeWindow,
  state: LogAnalysisState,
  signal?: AbortSignal
) {
  const result = logQuerySetResultSchema.parse(
    await apiMessagePostWithErrorEnvelope('/api/logs/analysis/queries', request, { signal: signal ?? null })
  );
  if (
    result.window.start !== window.from ||
    result.window.end !== window.to ||
    !matchesLogInterval(result.intervalMs, state) ||
    result.executed.queries.length !== request.queries.length ||
    result.executed.formulas.length !== request.formulas.length ||
    !result.executed.queries.every((query, index) => sameSource(query, request.queries[index]!)) ||
    !result.executed.formulas.every((formula, index) => {
      const expected = request.formulas[index]!;
      return (
        formula.refId === expected.refId &&
        formula.alias === expected.alias &&
        formula.visible === expected.visible &&
        formula.expression === expected.expression
      );
    })
  )
    throw new ExploreSignalContractError();
  return result;
}

function sameSource(actual: LogQuerySource, expected: LogQuerySource) {
  return (
    actual.refId === expected.refId &&
    actual.alias === expected.alias &&
    actual.visible === expected.visible &&
    actual.search === expected.search &&
    actual.searchSyntax === expected.searchSyntax &&
    (actual.timeShiftMs ?? 0) === (expected.timeShiftMs ?? 0) &&
    sameSourceAnalysis(actual.analysis, expected.analysis)
  );
}

function sameSourceAnalysis(a: LogQuerySource['analysis'], b: LogQuerySource['analysis']) {
  return (
    a.field === b.field &&
    sameLogGrouping(a.grouping, b.grouping) &&
    sameLogMeasure(a.measure ?? undefined, b.measure ?? undefined) &&
    a.limit === b.limit &&
    a.order === b.order &&
    a.minCount === b.minCount &&
    a.transform === b.transform
  );
}
