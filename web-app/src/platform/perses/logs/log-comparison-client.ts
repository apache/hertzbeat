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

import { shiftedLogWindow } from './log-timeshift';
import { requestedAdditionalMeasures, sameAdditionalMeasures } from './log-additional-measures';

import { matchesLogInterval, requestedLogInterval } from './log-interval';

import { apiMessagePostWithErrorEnvelope } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import { LogAnalysisState } from './log-analysis';
import { logComparisonResultSchema, type LogComparisonResult } from './log-comparison-result';

import { sameLogMeasure } from './log-measure';
import { sameLogGrouping } from './log-grouping';
import { ExploreSignalContractError } from '@/shared/signal-contract-error';
import { logAnalysisPath } from './log-analysis-client';
export function logComparisonRequest(scope: URLSearchParams, window: ExactTimeWindow, analysis: LogAnalysisState) {
  const comparison = analysis.comparison;
  if (
    !comparison ||
    comparison.search === undefined ||
    (comparison.timeShiftMs !== undefined && !shiftedLogWindow(window, comparison.timeShiftMs))
  )
    throw new ExploreSignalContractError();
  const params = new URLSearchParams(logAnalysisPath(scope, analysis).split('?')[1]);
  const search = params.get('search') ?? '';
  const searchSyntax = params.get('searchSyntax');
  params.delete('search');
  params.delete('searchSyntax');
  params.delete('logSort');
  const request = {
    version: 1,
    parameters: Object.fromEntries(params),
    queries: [
      { id: 'a', search: search, ...(searchSyntax ? { searchSyntax } : {}) },
      {
        id: 'b',
        ...(comparison.timeShiftMs === undefined ? {} : { timeShiftMs: comparison.timeShiftMs }),
        search: comparison.search,
        ...(comparison.searchSyntax ? { searchSyntax: comparison.searchSyntax } : {})
      }
    ],
    ...(comparison.formula === undefined ? {} : { formula: comparison.formula })
  };
  if (JSON.stringify(request).length > 32768) throw new ExploreSignalContractError();
  return request;
}
export async function loadLogComparison(
  request: ReturnType<typeof logComparisonRequest>,
  window: ExactTimeWindow,
  analysis: LogAnalysisState,
  signal?: AbortSignal
) {
  const result = logComparisonResultSchema.parse(
    await apiMessagePostWithErrorEnvelope('/api/logs/analysis/compare', request, { signal: signal ?? null })
  );
  const echoed = result.analysis;
  if (
    result.window.start !== window.from ||
    result.window.end !== window.to ||
    result.formula !== analysis.comparison?.formula ||
    result.bTimeShiftMs !== analysis.comparison?.timeShiftMs ||
    !sameComparisonAnalysis(echoed, analysis) ||
    !matchesLogInterval(result.intervalMs, analysis)
  )
    throw new ExploreSignalContractError();
  return result;
}

function sameComparisonAnalysis(echoed: LogComparisonResult['analysis'], analysis: LogAnalysisState) {
  return !(
    !sameComparisonSelection(echoed, analysis) ||
    echoed.view !== (analysis.representation === 'timeseries' ? 'timeseries' : 'groups') ||
    echoed.limit !== analysis.limit ||
    echoed.order !== analysis.order ||
    echoed.minCount !== analysis.minCount ||
    echoed.intervalMs !== requestedLogInterval(analysis)
  );
}

function sameComparisonSelection(echoed: LogComparisonResult['analysis'], analysis: LogAnalysisState) {
  return (
    (echoed.field?.id ?? undefined) === analysis.field &&
    sameLogMeasure(echoed.measure ?? undefined, analysis.measure) &&
    echoed.transform === analysis.transform &&
    sameLogGrouping(echoed.grouping ?? undefined, analysis.grouping) &&
    sameAdditionalMeasures(echoed.additionalMeasures, requestedAdditionalMeasures(analysis))
  );
}
