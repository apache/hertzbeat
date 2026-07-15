/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import { buildCrossSignalPath, buildExplorePath, mergeExploreQuery, parseExploreQuery, timeRangeMilliseconds } from './explore-model';

describe('explore query state', () => {
  it('keeps only supported values and trims empty context', () => {
    const query = parseExploreQuery(new URLSearchParams('signal=logs&timeRange=last-1h&serviceName=%20checkout%20&query=timeout&errorOnly=true'));
    expect(query).toMatchObject({
      signal: 'logs',
      timeRange: 'last-1h',
      serviceName: 'checkout',
      query: 'timeout'
    });
    expect(query).not.toHaveProperty('errorOnly');
  });

  it('builds a reproducible path without internal entity context', () => {
    expect(buildExplorePath({ signal: 'traces', timeRange: 'last-30m', serviceName: 'checkout', environment: 'prod', query: 'POST /checkout', errorOnly: true, end: 2000 })).toBe(
      '/explore?signal=traces&timeRange=last-30m&serviceName=checkout&environment=prod&query=POST+%2Fcheckout&errorOnly=true&end=2000'
    );
  });

  it('preserves trace context when moving from logs to traces', () => {
    expect(buildCrossSignalPath({ signal: 'logs', timeRange: 'last-30m', serviceName: 'checkout' }, 'traces', { traceId: 'trace-1' })).toBe(
      '/explore?signal=traces&timeRange=last-30m&serviceName=checkout&traceId=trace-1'
    );
  });

  it('drops fields that do not belong to the selected signal', () => {
    const metrics = mergeExploreQuery({ signal: 'logs', timeRange: 'last-30m', traceId: 'trace-1', severityText: 'ERROR', live: true }, { signal: 'metrics' });
    expect(metrics).toEqual({
      signal: 'metrics',
      timeRange: 'last-30m',
      serviceName: undefined,
      environment: undefined,
      query: undefined,
      end: undefined,
      metricFilter: undefined,
      groupBy: undefined,
      aggregation: undefined,
      step: undefined
    });
  });

  it('uses bounded time presets', () => {
    expect(timeRangeMilliseconds('last-24h')).toBe(86_400_000);
  });

});
