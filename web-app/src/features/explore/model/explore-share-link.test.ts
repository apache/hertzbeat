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

import { describe, expect, it } from 'vitest';
import { buildExploreSharePath } from './explore-share-link';
import { parseExploreQuery } from './explore-url-model';
import { DEFAULT_TRACE_VIEW, encodeTraceView } from './explore-trace-view';
const window = { from: 1788761069000, to: 1788761091000 };
const read = (path: string | undefined) => {
  expect(path).toBeDefined();
  return parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
};
describe('applied view links', () => {
  it.each(['metrics', 'logs', 'traces'] as const)('freezes %s evidence and removes authoring return state', signal => {
    const result = read(
      buildExploreSharePath(
        {
          signal,
          timeRange: 'last-30m',
          query: 'requests_total',
          savedView: 'private-draft',
          dashboardReturnTo: '/observability/dashboards'
        },
        'exact',
        window,
        'UTC'
      )
    );
    expect(result).toMatchObject({
      signal,
      start: window.from,
      end: window.to,
      timeZone: 'UTC',
      query: signal === 'logs' ? '"requests_total"' : 'requests_total',
      ...(signal === 'logs' ? { searchSyntax: 'structured-v1' } : {})
    });
    expect(result.savedView).toBeUndefined();
    expect(result.dashboardReturnTo).toBeUndefined();
  });
  it('retains matching-span population, layout and half-open bounds', () => {
    const traceView = encodeTraceView({ ...DEFAULT_TRACE_VIEW, population: 'matched_spans', density: 'comfortable' });
    expect(
      read(
        buildExploreSharePath(
          { signal: 'traces', timeRange: 'last-30m', traceView, endExclusive: true },
          'exact',
          window,
          'UTC'
        )
      )
    ).toMatchObject({ traceView, endExclusive: true });
  });
  it('makes relative intent explicit, without old fixed bounds or automatic refresh', () => {
    expect(
      read(
        buildExploreSharePath(
          { signal: 'logs', timeRange: 'last-1h', start: window.from, end: window.to, timeZone: 'UTC', sort: 'oldest' },
          'relative',
          window,
          'UTC'
        )
      )
    ).toMatchObject({
      timeRange: 'last-1h',
      sort: 'oldest',
      start: undefined,
      end: undefined,
      autoRefreshMs: undefined
    });
  });
  it('does not recast a focused trace as a relative investigation', () => {
    expect(
      buildExploreSharePath(
        {
          signal: 'traces',
          timeRange: 'last-30m',
          traceId: 'f854e0f122ad4ff3be337989fd826815',
          start: window.from,
          end: window.to,
          timeZone: 'UTC'
        },
        'relative',
        window,
        'UTC'
      )
    ).toBeUndefined();
  });
  it('shares live intent only as a live link without historical timestamps', () => {
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      live: true,
      serviceName: 'checkout',
      start: window.from,
      end: window.to
    };
    expect(buildExploreSharePath(query, 'exact', window, 'UTC')).toBeUndefined();
    expect(read(buildExploreSharePath(query, 'relative', window, 'UTC'))).toMatchObject({
      live: true,
      serviceName: 'checkout',
      start: undefined,
      end: undefined
    });
  });
  it('rejects malformed display state and unavailable exact windows', () => {
    expect(
      buildExploreSharePath({ signal: 'traces', timeRange: 'last-30m', traceView: '{bad' }, 'exact', window, 'UTC')
    ).toBeUndefined();
    expect(buildExploreSharePath({ signal: 'logs', timeRange: 'last-30m' }, 'exact', undefined, 'UTC')).toBeUndefined();
  });
});
