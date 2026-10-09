/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import { buildSignalApiPath } from './explore-api';
import { logComparisonRequest, type LogAnalysisState } from '@/platform/perses';
export function buildLogComparisonRequest(query: LogExploreQuery, window: ExactTimeWindow, analysis: LogAnalysisState) {
  return logComparisonRequest(
    new URLSearchParams(
      buildSignalApiPath({ ...query, start: window.from, end: window.to, windowMode: undefined }).split('?')[1]
    ),
    window,
    analysis
  );
}
