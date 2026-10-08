/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { requestedAdditionalMeasures, sameAdditionalMeasures } from './log-additional-measures';

import { matchesLogInterval } from './log-interval';
import { sameLogGrouping } from './log-grouping';
import { sameLogMeasure } from './log-measure';
import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import { logAnalysisResultSchema, type LogAnalysisResult, type LogAnalysisState } from './log-analysis';

import { ExploreSignalContractError } from '@/shared/signal-contract-error';
export function logAnalysisPath(params: URLSearchParams, analysis: LogAnalysisState) {
  for (const name of ['sort', 'pageIndex', 'pageSize']) params.delete(name);
  appendTimeFunction(params, analysis);
  const additionalMeasures = requestedAdditionalMeasures(analysis);
  if (additionalMeasures) params.set('additionalMeasures', JSON.stringify(additionalMeasures));
  if (analysis.measure) params.set('measure', JSON.stringify(analysis.measure));
  if (analysis.grouping) params.set('grouping', JSON.stringify(analysis.grouping));
  if (!analysis.grouping && analysis.field) params.set('field', analysis.field);
  params.set('view', analysis.representation === 'timeseries' ? 'timeseries' : 'groups');
  if (!analysis.grouping) params.set('limit', String(analysis.limit));
  params.set('order', analysis.order);
  params.set('minCount', String(analysis.minCount));
  return `/api/logs/analysis?${params}`;
}
export async function loadLogAnalysis(
  path: string,
  window: ExactTimeWindow,
  analysis: LogAnalysisState,
  signal?: AbortSignal
) {
  const result = logAnalysisResultSchema.parse(
    await apiMessageGet(path, { signal: signal ?? null, preserveErrorEnvelope: true })
  );
  if (
    result.window.start !== window.from ||
    result.window.end !== window.to ||
    !sameAnalysisFields(result, analysis) ||
    result.view !== (analysis.representation === 'timeseries' ? 'timeseries' : 'groups') ||
    result.limit !== analysis.limit ||
    result.order !== analysis.order ||
    result.minCount !== analysis.minCount ||
    !matchesLogInterval(result.intervalMs, analysis)
  )
    throw new ExploreSignalContractError();
  return result;
}

function sameAnalysisFields(result: LogAnalysisResult, analysis: LogAnalysisState) {
  return (
    (result.field?.id ?? undefined) === analysis.field &&
    sameLogMeasure(result.measure, analysis.measure) &&
    result.transform === analysis.transform &&
    sameLogGrouping(result.grouping, analysis.grouping) &&
    sameAdditionalMeasures(result.additionalMeasures, requestedAdditionalMeasures(analysis))
  );
}

function appendTimeFunction(params: URLSearchParams, analysis: LogAnalysisState) {
  if (analysis.transform && analysis.representation !== 'timeseries') throw new ExploreSignalContractError();
  if (analysis.representation === 'timeseries' && analysis.intervalMs !== undefined)
    params.set('intervalMs', String(analysis.intervalMs));
  if (analysis.transform) params.set('transform', analysis.transform);
}
