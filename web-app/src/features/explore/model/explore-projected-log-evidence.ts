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

import type { LogHistoryEvidence } from './explore-signal-contract';

export function projectedLogEvidence(
  window: { from: number; to: number },
  revision: number,
  pageIndex: number,
  page: { totalElements: number; rows: Array<{ log: LogHistoryEvidence['page']['content'][number] }> },
  trend?: {
    window: { start: number; end: number };
    result: { matchingTotal: number; intervalMs: number; buckets: Array<{ start: number; count: number }> };
  }
) {
  const { totalElements, rows } = page;
  return {
    signal: 'logs' as const,
    window,
    revision,
    data: {
      page: {
        content: rows.map(row => row.log),
        totalElements,
        totalPages: Math.ceil(totalElements / 20),
        number: pageIndex,
        size: 20
      },
      overview: trend
        ? { kind: 'count_only' as const, data: { totalCount: trend.result.matchingTotal } }
        : { kind: 'error' as const },
      trend: trend
        ? {
            kind: 'ready' as const,
            data: {
              start: trend.window.start,
              end: trend.window.end,
              intervalMs: trend.result.intervalMs,
              buckets: trend.result.buckets
            }
          }
        : { kind: 'error' as const }
    }
  };
}
