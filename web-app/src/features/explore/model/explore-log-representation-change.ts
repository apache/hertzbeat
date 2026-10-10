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

import { DEFAULT_LOG_ANALYSIS, type LogAnalysisState, type LogQuerySource } from '@/platform/perses';
import { readLogAnalysisDraft } from './explore-log-analysis';

export function logRepresentationChange(
  appliedRaw: string | undefined,
  draftRaw: string | undefined,
  representation: LogAnalysisState['representation']
) {
  const current = readLogAnalysisDraft(draftRaw) ?? DEFAULT_LOG_ANALYSIS;
  const source = logSourceForLogs(current, representation);
  const canReturnToLogs = source !== undefined;
  const next = { ...current, representation };
  if (canReturnToLogs) delete next.querySet;
  return {
    value: JSON.stringify(next),
    pending: draftRaw !== appliedRaw,
    ...(source ? { query: source.search ?? '', searchSyntax: source.searchSyntax } : {})
  };
}

export function applyLogRepresentationChange(
  appliedRaw: string | undefined,
  representation: LogAnalysisState['representation'],
  apply: (patch: { logAnalysis: string; query?: string; searchSyntax?: string }) => boolean
) {
  const next = logRepresentationChange(appliedRaw, appliedRaw, representation);
  return apply({
    logAnalysis: next.value,
    ...(next.query === undefined ? {} : { query: next.query }),
    ...(next.searchSyntax === undefined ? {} : { searchSyntax: next.searchSyntax })
  });
}

function logSourceForLogs(current: LogAnalysisState, representation: LogAnalysisState['representation']) {
  if (representation !== 'logs') return undefined;
  const querySet = current.querySet;
  if (!querySet || querySet.queries.length !== 1 || querySet.formulas.length !== 0) return undefined;
  const source = querySet.queries[0]!;
  if (source.timeShiftMs || !defaultSourceAnalysis(source.analysis)) return undefined;
  return source;
}

function defaultSourceAnalysis(analysis: LogQuerySource['analysis']) {
  if (analysis.field || analysis.grouping || analysis.measure || analysis.transform) return false;
  return (
    analysis.limit === DEFAULT_LOG_ANALYSIS.limit &&
    analysis.order === DEFAULT_LOG_ANALYSIS.order &&
    analysis.minCount === DEFAULT_LOG_ANALYSIS.minCount
  );
}
