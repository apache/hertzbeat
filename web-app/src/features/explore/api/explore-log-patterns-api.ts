/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import { buildSignalApiPath } from './explore-api';
import { parseLogPage } from './explore-log-schema';
import type { LogExploreQuery } from '../model/explore-query';

const LOG_PATTERN_SAMPLE_LIMIT = 1000;

export function buildLogPatternSamplePath(query: LogExploreQuery, window: ExactTimeWindow) {
  const path = buildSignalApiPath({
    ...query,
    start: window.from,
    end: window.to,
    pageIndex: 0,
    sort: 'newest',
    logSort: undefined
  });
  const url = new URL(path, 'http://local');
  url.searchParams.set('pageSize', String(LOG_PATTERN_SAMPLE_LIMIT));
  return url.pathname + url.search;
}

export async function loadLogPatternSample(path: string, signal: AbortSignal) {
  return parseLogPage(await apiMessageGet(path, { signal, preserveErrorEnvelope: true }), 0, LOG_PATTERN_SAMPLE_LIMIT);
}
