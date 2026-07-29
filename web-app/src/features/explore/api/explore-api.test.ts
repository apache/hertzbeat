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

const { apiMessageGet, openBrowserEventStream } = vi.hoisted(() => ({
  apiMessageGet: vi.fn(),
  openBrowserEventStream: vi.fn((path: unknown, handlers: unknown) => {
    void path;
    void handlers;
    return { close: vi.fn() };
  })
}));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));
vi.mock('@/core/http/event-stream', () => ({ openBrowserEventStream }));

import {
  buildLogStreamPath,
  buildSignalApiPath,
  buildTraceDetailApiPath,
  classifyExploreSignalError,
  loadLogSignal,
  loadMetricSignal,
  loadTraceDetail,
  loadTraceSignal,
  openLogStream
} from './explore-api';
import { ExploreSignalContractError, ExploreSignalMissingError } from '../model/explore-signal-contract';
import { parseExploreQuery } from '../model/explore-model';

describe('explore API paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('maps the shared context to each signal API', () => {
    const base = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      query: 'timeout',
      traceId: 'trace-1'
    };
    expect(buildSignalApiPath(base, 1_000_000)).toBe(
      '/api/logs/list?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&pageIndex=0&pageSize=20&search=timeout&traceId=trace-1'
    );
    expect(buildSignalApiPath({ ...base, signal: 'traces' }, 1_000_000)).toBe(
      '/api/traces/list?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&pageIndex=0&pageSize=20&operationName=timeout&traceId=trace-1'
    );
    expect(buildSignalApiPath({ ...base, signal: 'metrics' }, 1_000_000)).toBe(
      '/api/ingestion/otlp/metrics/console?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&query=timeout'
    );
    expect(buildSignalApiPath({ ...base, signal: 'metrics', operationName: 'POST /checkout' }, 1_000_000)).toContain(
      '&query=timeout&operationName=POST+%2Fcheckout'
    );
    expect(buildLogStreamPath(base)).toBe(
      '/api/logs/sse/subscribe?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&logContent=timeout&traceId=trace-1'
    );
  });

  it('slides every relative window from the current request time and ignores an orphaned end', () => {
    const relative = { signal: 'metrics' as const, timeRange: 'last-15m' as const };
    expect(buildSignalApiPath(relative, 1_000_000)).toContain('start=100000&end=1000000');
    expect(buildSignalApiPath(relative, 2_000_000)).toContain('start=1100000&end=2000000');
    expect(buildSignalApiPath({ ...relative, end: 1_500_000 }, 2_000_000)).toContain('start=1100000&end=2000000');
  });

  it('maps advanced log filters to history and stream contracts', () => {
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      serviceName: 'checkout',
      query: 'timeout',
      severityText: 'ERROR',
      traceId: 'trace-1',
      spanId: 'span-1',
      resourceFilter: 'service.version=1.2.3',
      attributeFilter: 'http.route:/checkout',
      hideInternal: true,
      hideNoise: true
    };
    expect(buildSignalApiPath(query, 2_000_000)).toContain(
      'severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout' +
        '&hideInternal=true&hideNoise=true'
    );
    expect(buildLogStreamPath(query)).toBe(
      '/api/logs/sse/subscribe?serviceName=checkout&logContent=timeout&traceId=trace-1&spanId=span-1' +
        '&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout' +
        '&hideInternal=true&hideNoise=true'
    );
  });

  it('maps signal-specific advanced filters without entity context', () => {
    const metricPath = buildSignalApiPath(
      {
        signal: 'metrics',
        timeRange: 'last-1h',
        query: 'latency',
        metricFilter: 'method=POST',
        groupBy: 'service_name',
        aggregation: 'avg',
        temporalAggregation: 'delta',
        step: '60'
      },
      4_000_000
    );
    expect(metricPath).toContain(
      'filter=method%3DPOST&groupBy=service_name&aggregation=avg&temporalAggregation=delta&step=60'
    );

    const tracePath = buildSignalApiPath(
      {
        signal: 'traces',
        timeRange: 'last-1h',
        traceId: 'trace-1',
        spanId: 'span-selection-only',
        resourceFilter: 'cloud.region=ap-southeast-1',
        attributeFilter: 'http.route=/checkout',
        minDurationMs: 100,
        maxDurationMs: 5000,
        errorOnly: true,
        spanScope: 'root',
        hideInternal: true
      },
      4_000_000
    );
    expect(tracePath).toContain(
      'traceId=trace-1&resourceFilter=cloud.region%3Dap-southeast-1' +
        '&attributeFilter=http.route%3D%2Fcheckout&minDurationMs=100&maxDurationMs=5000' +
        '&errorOnly=true&spanScope=root&hideInternal=true'
    );
    expect(tracePath).not.toContain('spanId');
  });

  it('does not forward invalid URL-owned field values to signal APIs', () => {
    const metricPath = buildSignalApiPath(
      parseExploreQuery(new URLSearchParams('signal=metrics&aggregation=p95&step=1.5')),
      4_000_000
    );
    const tracePath = buildSignalApiPath(
      parseExploreQuery(new URLSearchParams('signal=traces&minDurationMs=1.5&maxDurationMs=200')),
      4_000_000
    );

    expect(metricPath).not.toContain('aggregation=');
    expect(metricPath).not.toContain('step=');
    expect(tracePath).not.toContain('minDurationMs=');
    expect(tracePath).toContain('maxDurationMs=200');
  });

  it('uses the exact valid onboarding scope and refuses partial or reversed instrumentation context', () => {
    const scoped = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      collectorId: 'collector-east',
      start: 1_710_000_000_000,
      end: 1_710_000_005_000
    };
    expect(buildSignalApiPath(scoped)).toBe(
      '/api/logs/list?serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
        '&start=1710000000000&end=1710000005000&pageIndex=0&pageSize=20'
    );
    expect(buildLogStreamPath(scoped)).toBe(
      '/api/logs/sse/subscribe?serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east'
    );

    const invalid = { ...scoped, start: 2_000_000, end: 1_000_000 };
    expect(() => buildSignalApiPath(invalid, 3_000_000)).toThrow(/instrumentation context/i);
    expect(() => buildLogStreamPath(invalid)).toThrow(/instrumentation context/i);

    const partial = { signal: 'traces' as const, timeRange: 'last-15m' as const, collectorId: 'collector-east' };
    expect(() => buildSignalApiPath(partial, 3_000_000)).toThrow(/instrumentation context/i);

    const preset = { ...scoped, windowMode: 'preset' as const, start: undefined, end: undefined };
    expect(buildSignalApiPath(preset, 3_000_000)).toContain('start=2100000&end=3000000');
    expect(buildSignalApiPath(preset, 4_000_000)).toContain('start=3100000&end=4000000');
    expect(buildSignalApiPath(preset, 4_000_000)).toContain('collectorId=collector-east');

    expect(() => buildSignalApiPath({ ...preset, start: 2_000_000 }, 4_000_000)).toThrow(/instrumentation context/i);
    expect(() => buildSignalApiPath({ ...preset, end: 3_000_000 }, 4_000_000)).toThrow(/instrumentation context/i);
    expect(buildSignalApiPath(scoped, 4_000_000)).toContain('start=1710000000000&end=1710000005000');
  });

  it.each([
    ['metrics', '/api/ingestion/otlp/metrics/console?'],
    ['logs', '/api/logs/list?'],
    ['traces', '/api/traces/list?']
  ] as const)('queries %s with an exact direct-server handoff window', (signal, prefix) => {
    const path = buildSignalApiPath({
      signal,
      timeRange: 'last-15m',
      intakeProfileId: 'primary-ingress',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      start: 1_710_000_000_000,
      end: 1_710_000_005_000
    });

    expect(path).toBe(
      `${prefix}serviceName=checkout-api&serviceNamespace=commerce&environment=prod` +
        '&start=1710000000000&end=1710000005000' +
        (signal === 'metrics' ? '' : '&pageIndex=0&pageSize=20')
    );
    expect(path).not.toMatch(/intakeProfileId|collectorId/u);
  });

  it('does not open HTTP or EventSource transport for a preset with residual timestamps', async () => {
    const invalid = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      collectorId: 'collector-east',
      windowMode: 'preset' as const,
      end: 3_000_000
    };

    await expect(loadLogSignal(invalid)).rejects.toThrow(/instrumentation context/i);
    expect(apiMessageGet).not.toHaveBeenCalled();
    expect(() => buildLogStreamPath(invalid)).toThrow(/instrumentation context/i);
    expect(openBrowserEventStream).not.toHaveBeenCalled();
  });

  it('loads encoded trace detail through the parser boundary', async () => {
    const signal = new AbortController().signal;
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=traces&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
          '&instance=checkout-1&endpoint=%2Fcheckout&traceId=trace%20%2F%201&spanId=span-1' +
          '&resourceFilter=service.version%3D1&attributeFilter=http.route%3D%2Fcheckout' +
          '&minDurationMs=100&maxDurationMs=200&start=1000&end=2000'
      )
    );
    if (query.signal !== 'traces') throw new Error('trace query expected');
    apiMessageGet.mockResolvedValueOnce({ ...traceRow('trace / 1'), spans: null }).mockResolvedValueOnce([]);

    await expect(loadTraceDetail(query, 'trace / 1', signal)).resolves.toMatchObject({
      traceId: 'trace / 1',
      spans: []
    });
    const context =
      'serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-1' +
      '&endpoint=%2Fcheckout&start=1000&end=2000&spanId=span-1&resourceFilter=service.version%3D1' +
      '&attributeFilter=http.route%3D%2Fcheckout&minDurationMs=100&maxDurationMs=200';
    expect(apiMessageGet).toHaveBeenNthCalledWith(1, `/api/traces/trace%20%2F%201?${context}`, { signal });
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, `/api/traces/trace%20%2F%201/spans?${context}`, { signal });
    expect(buildTraceDetailApiPath(query, 'trace / 1', false, 9_999)).toContain('start=1000&end=2000');
  });

  it('uses one relative time snapshot for trace detail and spans', async () => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValueOnce(4_000_000).mockReturnValueOnce(9_000_000);
    try {
      apiMessageGet.mockResolvedValueOnce({ ...traceRow('trace-1'), spans: null }).mockResolvedValueOnce([]);

      await loadTraceDetail({ signal: 'traces', timeRange: 'last-30m' }, 'trace-1');

      expect(dateNow).toHaveBeenCalledTimes(1);
      expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/api/traces/trace-1?start=2200000&end=4000000', {
        signal: null
      });
      expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/api/traces/trace-1/spans?start=2200000&end=4000000', {
        signal: null
      });
    } finally {
      dateNow.mockRestore();
    }
  });

  it('passes AbortSignal and parses every raw signal response', async () => {
    const signal = new AbortController().signal;
    apiMessageGet
      .mockResolvedValueOnce({
        context: null,
        query: null,
        datasource: null,
        queryMode: null,
        results: null,
        stats: null,
        emptyStateReason: null,
        errorMessage: null
      })
      .mockResolvedValueOnce(springPage([]))
      .mockResolvedValueOnce(springPage([traceRow('trace-1')]));
    await loadMetricSignal({ signal: 'metrics', timeRange: 'last-15m' }, signal);
    await loadLogSignal({ signal: 'logs', timeRange: 'last-15m', pageIndex: 0 }, signal);
    await loadTraceSignal({ signal: 'traces', timeRange: 'last-15m', pageIndex: 0 }, signal);
    expect(apiMessageGet).toHaveBeenCalledTimes(3);
    expect(
      apiMessageGet.mock.calls.every((call: unknown[]) => (call[1] as { signal: AbortSignal }).signal === signal)
    ).toBe(true);
  });

  it('keeps missing, transport, contract, and other failures distinct', () => {
    expect(classifyExploreSignalError(new ExploreSignalMissingError())).toBe('missing');
    expect(classifyExploreSignalError(new ApiMessageError('unauthorized', { status: 401 }))).toBe('permission');
    expect(classifyExploreSignalError(new ApiMessageError('forbidden', { status: 403 }))).toBe('permission');
    expect(classifyExploreSignalError(new ApiMessageError('offline', { status: 503 }))).toBe('transport_error');
    expect(classifyExploreSignalError(new ExploreSignalContractError('bad'))).toBe('contract_error');
    expect(classifyExploreSignalError(new Error('bad'))).toBe('error');
  });

  it('parses stream events at the API boundary and reports malformed payloads without values', () => {
    const onLog = vi.fn();
    const onGap = vi.fn();
    const onContractError = vi.fn();
    openLogStream('/stream', {
      onOpen: vi.fn(),
      onLog,
      onGap,
      onRetrying: vi.fn(),
      onUnavailable: vi.fn(),
      onContractError
    });
    const transportHandlers = openBrowserEventStream.mock.calls[0]?.[1] as
      | {
          onEvent: (name: string, data: string) => void;
        }
      | undefined;

    transportHandlers?.onEvent('LOG_EVENT', JSON.stringify(logRow('valid')));
    transportHandlers?.onEvent('LOG_EVENT', '{private malformed body');
    transportHandlers?.onEvent(
      'LOG_STREAM_GAP',
      JSON.stringify({ observedAt: 1_750_000_000_000, reason: 'queue_overflow', droppedCount: 37 })
    );
    for (const invalidGap of [
      { observedAt: 1_750_000_000_000, reason: 'queue_overflow' },
      { observedAt: 0, reason: 'queue_overflow', droppedCount: 1 },
      { observedAt: 1_750_000_000_000, reason: 'queue_overflow', droppedCount: 0 },
      { observedAt: 1_750_000_000_000, reason: 'queue_overflow', droppedCount: Number.MAX_SAFE_INTEGER + 1 },
      { observedAt: 1_750_000_000_000, reason: 'unknown', droppedCount: 1 },
      { observedAt: 1_750_000_000_000, reason: 'queue_overflow', droppedCount: 1, detail: 'private' }
    ]) {
      transportHandlers?.onEvent('LOG_STREAM_GAP', JSON.stringify(invalidGap));
    }
    transportHandlers?.onEvent('LOG_STREAM_GAP', '{malformed');

    expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ body: 'valid' }));
    expect(onGap).toHaveBeenCalledOnce();
    expect(onGap).toHaveBeenCalledWith({
      observedAt: 1_750_000_000_000,
      reason: 'queue_overflow',
      droppedCount: 37
    });
    expect(onContractError).toHaveBeenCalledTimes(8);
    expect(openBrowserEventStream.mock.calls[0]?.[1]).toMatchObject({
      eventNames: ['LOG_EVENT', 'LOG_STREAM_GAP']
    });
  });
});

function springPage(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 };
}

function traceRow(traceId: string) {
  return {
    traceId,
    rootSpanId: null,
    serviceName: null,
    serviceNamespace: null,
    rootSpanName: null,
    durationNanos: null,
    status: null,
    startTime: null,
    errorSpanCount: 0,
    resourceAttributes: null
  };
}

function logRow(body: string) {
  return {
    timeUnixNano: 1_750_000_000_000_000_000,
    observedTimeUnixNano: null,
    severityNumber: 9,
    severityText: 'INFO',
    body,
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null
  };
}
