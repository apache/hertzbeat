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

import { apiMessageGet, ApiMessageError } from '@/core/http/api-message';
import type { TraceExploreQuery } from '../model/explore-query';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { buildSignalApiPath } from './explore-signal-paths';
import { parseTracePage } from './explore-trace-schema';
export async function loadErrorTraceSamples(query: TraceExploreQuery, signal?: AbortSignal) {
  const [path, search] = buildSignalApiPath({ ...query, errorOnly: true, pageIndex: 0, sort: 'newest' }).split('?');
  const params = new URLSearchParams(search);
  params.set('pageSize', '2');
  try {
    const page = parseTracePage(await apiMessageGet(`${path}?${params}`, { signal: signal ?? null }), 0, 2, 'newest');
    if (page.content.some(row => row.errorSpanCount === 0)) throw new ExploreSignalContractError();
    return { state: 'ready' as const, rows: page.content };
  } catch (error) {
    if (error instanceof ApiMessageError && (error.status === 404 || error.status === 501))
      return { state: 'unsupported' as const, rows: [] };
    throw error;
  }
}
