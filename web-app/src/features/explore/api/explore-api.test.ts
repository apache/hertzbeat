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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()), apiMessageGet
}));

import {
  buildLogStreamPath, buildSignalApiPath, classifyExploreSignalError, loadLogSignal,
  loadMetricSignal, loadTraceDetail, loadTraceSignal
} from './explore-api';
import { ExploreSignalContractError, ExploreSignalMissingError } from '../model/explore-signal-contract';

describe('explore API paths', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('maps the shared context to each signal API', () => {
    const base = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      serviceName: 'checkout',
      environment: 'prod',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      query: 'timeout',
      traceId: 'trace-1'
    };
    expect(buildSignalApiPath(base, 1_000_000)).toBe('/api/logs/list?serviceName=checkout&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&pageIndex=0&pageSize=20&search=timeout&traceId=trace-1');
    expect(buildSignalApiPath({ ...base, signal: 'traces' }, 1_000_000)).toBe('/api/traces/list?serviceName=checkout&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&pageIndex=0&pageSize=20&operationName=timeout&traceId=trace-1');
    expect(buildSignalApiPath({ ...base, signal: 'metrics' }, 1_000_000)).toBe('/api/ingestion/otlp/metrics/console?serviceName=checkout&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&query=timeout');
    expect(buildLogStreamPath(base)).toBe('/api/logs/sse/subscribe?serviceName=checkout&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&logContent=timeout&traceId=trace-1');
  });

  it('slides an unanchored relative window but preserves an explicit shared URL end', () => {
    const relative = { signal: 'metrics' as const, timeRange: 'last-15m' as const };
    expect(buildSignalApiPath(relative, 1_000_000)).toContain('start=100000&end=1000000');
    expect(buildSignalApiPath(relative, 2_000_000)).toContain('start=1100000&end=2000000');
    expect(buildSignalApiPath({ ...relative, end: 1_500_000 }, 2_000_000)).toContain('start=600000&end=1500000');
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

  it('uses the exact valid onboarding scope and refuses partial or reversed instrumentation context', () => {
    const scoped = {
      signal: 'logs' as const, timeRange: 'last-15m' as const, serviceName: 'checkout-api',
      serviceNamespace: 'commerce', environment: 'prod', collectorId: 'collector-east',
      start: 1_710_000_000_000, end: 1_710_000_005_000
    };
    expect(buildSignalApiPath(scoped)).toBe(
      '/api/logs/list?serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east'
      + '&start=1710000000000&end=1710000005000&pageIndex=0&pageSize=20'
    );
    expect(buildLogStreamPath(scoped)).toBe(
      '/api/logs/sse/subscribe?serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east'
    );

    const invalid = { ...scoped, start: 2_000_000, end: 1_000_000 };
    expect(() => buildSignalApiPath(invalid, 3_000_000)).toThrow(/instrumentation context/i);
    expect(() => buildLogStreamPath(invalid)).toThrow(/instrumentation context/i);

    const partial = { signal: 'traces' as const, timeRange: 'last-15m' as const, collectorId: 'collector-east' };
    expect(() => buildSignalApiPath(partial, 3_000_000)).toThrow(/instrumentation context/i);

    const preset = { ...scoped, windowMode: 'preset' as const, start: undefined, end: 3_000_000 };
    expect(buildSignalApiPath(preset)).toContain('start=2100000&end=3000000');
    expect(buildSignalApiPath(preset)).toContain('collectorId=collector-east');
  });

  it('loads encoded trace detail through the parser boundary', async () => {
    const signal = new AbortController().signal;
    apiMessageGet.mockResolvedValue({ ...traceRow('trace / 1'), spans: null });

    await expect(loadTraceDetail('trace / 1', signal)).resolves.toMatchObject({ traceId: 'trace / 1', spans: null });
    expect(apiMessageGet).toHaveBeenCalledWith('/api/traces/trace%20%2F%201', { signal });
  });

  it('passes AbortSignal and parses every raw signal response', async () => {
    const signal = new AbortController().signal;
    apiMessageGet
      .mockResolvedValueOnce({ context: null, query: null, datasource: null, queryMode: null, results: null, stats: null, emptyStateReason: null, errorMessage: null })
      .mockResolvedValueOnce(springPage([]))
      .mockResolvedValueOnce(springPage([traceRow('trace-1')]));
    await loadMetricSignal({ signal: 'metrics', timeRange: 'last-15m' }, signal);
    await loadLogSignal({ signal: 'logs', timeRange: 'last-15m', pageIndex: 0 }, signal);
    await loadTraceSignal({ signal: 'traces', timeRange: 'last-15m', pageIndex: 0 }, signal);
    expect(apiMessageGet).toHaveBeenCalledTimes(3);
    expect(apiMessageGet.mock.calls.every((call: unknown[]) => (call[1] as { signal: AbortSignal }).signal === signal)).toBe(true);
  });

  it('keeps missing, transport, contract, and other failures distinct', () => {
    expect(classifyExploreSignalError(new ExploreSignalMissingError())).toBe('missing');
    expect(classifyExploreSignalError(new ApiMessageError('offline', { status: 503 }))).toBe('transport_error');
    expect(classifyExploreSignalError(new ExploreSignalContractError('bad'))).toBe('contract_error');
    expect(classifyExploreSignalError(new Error('bad'))).toBe('error');
  });
});

function springPage(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 };
}

function traceRow(traceId: string) {
  return { traceId, rootSpanId: null, serviceName: null, serviceNamespace: null, rootSpanName: null,
    durationNanos: null, status: null, startTime: null, errorSpanCount: 0, resourceAttributes: null };
}
