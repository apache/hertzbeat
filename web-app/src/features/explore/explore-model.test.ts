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

import { buildCrossSignalPath, buildExplorePath, buildLogStreamPath, buildSignalApiPath, parseExploreQuery, timeRangeMilliseconds } from './explore-model';

describe('explore query state', () => {
  it('keeps only supported values and trims empty context', () => {
    expect(parseExploreQuery(new URLSearchParams('signal=logs&timeRange=last-1h&serviceName=%20checkout%20&query=timeout&errorOnly=true'))).toEqual({
      signal: 'logs',
      timeRange: 'last-1h',
      serviceName: 'checkout',
      query: 'timeout',
      errorOnly: true
    });
  });

  it('builds a reproducible path without internal entity context', () => {
    expect(buildExplorePath({ signal: 'traces', timeRange: 'last-30m', serviceName: 'checkout', environment: 'prod', query: 'POST /checkout', errorOnly: true, end: 2000 })).toBe(
      '/explore?signal=traces&timeRange=last-30m&serviceName=checkout&environment=prod&query=POST+%2Fcheckout&errorOnly=true&end=2000'
    );
  });

  it('maps the shared context to each existing query API', () => {
    const base = { signal: 'logs' as const, timeRange: 'last-15m' as const, serviceName: 'checkout', environment: 'prod', query: 'timeout', traceId: 'trace-1' };
    expect(buildSignalApiPath(base, 1_000_000)).toBe('/api/logs/list?serviceName=checkout&environment=prod&start=100000&end=1000000&pageIndex=0&pageSize=20&search=timeout&traceId=trace-1');
    expect(buildSignalApiPath({ ...base, signal: 'traces' }, 1_000_000)).toBe('/api/traces/list?serviceName=checkout&environment=prod&start=100000&end=1000000&pageIndex=0&pageSize=20&operationName=timeout&traceId=trace-1');
    expect(buildSignalApiPath({ ...base, signal: 'metrics' }, 1_000_000)).toBe('/api/ingestion/otlp/metrics/console?serviceName=checkout&environment=prod&start=100000&end=1000000&query=timeout');
  });

  it('preserves trace context when moving from logs to traces', () => {
    expect(buildCrossSignalPath({ signal: 'logs', timeRange: 'last-30m', serviceName: 'checkout' }, 'traces', { traceId: 'trace-1' })).toBe(
      '/explore?signal=traces&timeRange=last-30m&serviceName=checkout&traceId=trace-1'
    );
  });

  it('uses bounded time presets', () => {
    expect(timeRangeMilliseconds('last-24h')).toBe(86_400_000);
  });

  it('maps advanced log filters to history and stream contracts', () => {
    const query = { signal: 'logs' as const, timeRange: 'last-30m' as const, serviceName: 'checkout', query: 'timeout', severityText: 'ERROR', traceId: 'trace-1', spanId: 'span-1', resourceFilter: 'service.version=1.2.3', attributeFilter: 'http.route:/checkout' };
    expect(buildSignalApiPath(query, 2_000_000)).toContain('severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout');
    expect(buildLogStreamPath(query)).toBe('/api/logs/sse/subscribe?serviceName=checkout&logContent=timeout&traceId=trace-1&spanId=span-1&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout');
  });
});
