/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { isAnalysisReturnPath } from './explore-return-path';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from './explore-query';
import type { LogFacetField } from './explore-log-facets';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, type LogAnalysisGroup } from '@/platform/perses';
import { logAnalysisGroupAction } from './explore-log-analysis-action';
import { draftFromQuery, buildSubmissionPatch } from './explore-submission-model';
import { buildExplorePath, normalizeExploreReturnTo } from './explore-url-model';
export function logAnalysisDrilldownPath(
  query: LogExploreQuery,
  window: ExactTimeWindow,
  field: LogFacetField | null,
  group: LogAnalysisGroup
) {
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') return undefined;
  const action = logAnalysisGroupAction(draft, field, group);
  if (!action.available) return undefined;
  const updated = action.update ? { ...draft, [action.update.field]: action.update.value } : draft;
  const submission = buildSubmissionPatch(updated);
  if (!submission.valid) return undefined;
  const absolute = { ...query, start: window.from, end: window.to, windowMode: undefined, autoRefreshMs: undefined };
  const returnTo = normalizeExploreReturnTo(buildExplorePath({ ...absolute, returnTo: undefined }));
  if (!returnTo) return undefined;
  return buildExplorePath({
    ...absolute,
    ...submission.patch,
    signal: 'logs',
    timeRange: query.timeRange,
    pageIndex: undefined,
    savedView: undefined,
    logAnalysis: encodeLogAnalysis(DEFAULT_LOG_ANALYSIS),
    returnTo
  });
}
export function logAnalysisReturnPath(value: string | undefined) {
  const safe = normalizeExploreReturnTo(value);
  return isAnalysisReturnPath(safe) ? safe : undefined;
}
