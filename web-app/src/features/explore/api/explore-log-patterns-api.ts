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
