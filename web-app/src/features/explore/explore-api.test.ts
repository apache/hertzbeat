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

import { buildLogStreamPath, buildSignalApiPath } from './explore-api';

describe('explore API paths', () => {
  it('maps the shared context to each signal API', () => {
    const base = { signal: 'logs' as const, timeRange: 'last-15m' as const, serviceName: 'checkout', environment: 'prod', query: 'timeout', traceId: 'trace-1' };
    expect(buildSignalApiPath(base, 1_000_000)).toBe('/api/logs/list?serviceName=checkout&environment=prod&start=100000&end=1000000&pageIndex=0&pageSize=20&search=timeout&traceId=trace-1');
    expect(buildSignalApiPath({ ...base, signal: 'traces' }, 1_000_000)).toBe('/api/traces/list?serviceName=checkout&environment=prod&start=100000&end=1000000&pageIndex=0&pageSize=20&operationName=timeout&traceId=trace-1');
    expect(buildSignalApiPath({ ...base, signal: 'metrics' }, 1_000_000)).toBe('/api/ingestion/otlp/metrics/console?serviceName=checkout&environment=prod&start=100000&end=1000000&query=timeout');
  });

  it('maps advanced log filters to history and stream contracts', () => {
    const query = { signal: 'logs' as const, timeRange: 'last-30m' as const, serviceName: 'checkout', query: 'timeout', severityText: 'ERROR', traceId: 'trace-1', spanId: 'span-1', resourceFilter: 'service.version=1.2.3', attributeFilter: 'http.route:/checkout' };
    expect(buildSignalApiPath(query, 2_000_000)).toContain('severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout');
    expect(buildLogStreamPath(query)).toBe('/api/logs/sse/subscribe?serviceName=checkout&logContent=timeout&traceId=trace-1&spanId=span-1&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout');
  });

  it('maps signal-specific advanced filters without entity context', () => {
    const metricPath = buildSignalApiPath({ signal: 'metrics', timeRange: 'last-1h', query: 'latency', metricFilter: 'method=POST', groupBy: 'service_name', aggregation: 'avg', step: '60s' }, 4_000_000);
    expect(metricPath).toContain('filter=method%3DPOST&groupBy=service_name&aggregation=avg&step=60s');

    const tracePath = buildSignalApiPath({ signal: 'traces', timeRange: 'last-1h', resourceFilter: 'cloud.region=ap-southeast-1', minDurationMs: 100, maxDurationMs: 5000, errorOnly: true }, 4_000_000);
    expect(tracePath).toContain('resourceFilter=cloud.region%3Dap-southeast-1&minDurationMs=100&maxDurationMs=5000&errorOnly=true');
  });
});
