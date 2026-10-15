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
  classifyExploreSignalError,
  loadLogHistoryEvidence,
  loadLogStatistics,
  loadLogSignal,
  loadMetricSignal,
  loadMetricInventory,
  loadTraceSignal,
  openLogStream
} from './explore-api';
import { ExploreSignalContractError, ExploreSignalMissingError } from '../model/explore-signal-contract';
import { parseExploreQuery } from '../model/explore-model';

describe('explore API paths', () => {
  it('uses severity categories for both history and live without rewriting original text', () => {
    const query = { signal: 'logs', timeRange: 'last-30m', severityCategory: 'ERROR', severityText: 'SEVERE' } as const;
    for (const path of [buildSignalApiPath(query, 10_000_000), buildLogStreamPath(query)]) {
      const params = new URL(path, 'http://local').searchParams;
      expect(params.get('severityCategory')).toBe('ERROR');
      expect(params.get('severityText')).toBe('SEVERE');
    }
  });
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
      traceId: '0123456789abcdef0123456789abcdef'
    };
    expect(buildSignalApiPath(base, 1_000_000)).toBe(
      '/api/logs/list?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&pageIndex=0&pageSize=20&search=timeout&traceId=0123456789abcdef0123456789abcdef'
    );
    expect(buildSignalApiPath({ ...base, signal: 'traces' }, 1_000_000)).toBe(
      '/api/traces/list?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&pageIndex=0&pageSize=20&sort=newest&operationName=timeout&traceId=0123456789abcdef0123456789abcdef'
    );
    expect(buildSignalApiPath({ ...base, signal: 'metrics' }, 1_000_000)).toBe(
      '/api/ingestion/otlp/metrics/console?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&start=100000&end=1000000&query=timeout'
    );
    expect(buildSignalApiPath({ ...base, signal: 'metrics', operationName: 'POST /checkout' }, 1_000_000)).toContain(
      '&query=timeout&operationName=POST+%2Fcheckout'
    );
    expect(buildLogStreamPath(base)).toBe(
      '/api/logs/sse/subscribe?serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout&logContent=timeout&traceId=0123456789abcdef0123456789abcdef'
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
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
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
      '/api/logs/sse/subscribe?serviceName=checkout&logContent=timeout&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef' +
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
        traceId: '0123456789abcdef0123456789abcdef',
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
      'traceId=0123456789abcdef0123456789abcdef&resourceFilter=cloud.region%3Dap-southeast-1' +
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

  it('queries an exact entity Metrics handoff without synthetic ingestion dimensions', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=metrics&entityId=677625915133184&start=1750000000000&end=1750000060000' +
          '&timeZone=Asia%2FShanghai&query=request_rate_per_second'
      )
    );

    expect(buildSignalApiPath(query)).toBe(
      '/api/ingestion/otlp/metrics/console?entityId=677625915133184&start=1750000000000' +
        '&end=1750000060000&query=request_rate_per_second'
    );
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
        (signal === 'metrics' ? '' : '&pageIndex=0&pageSize=20') +
        (signal === 'traces' ? '&sort=newest' : '')
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
      .mockResolvedValueOnce(stableLogPage([]))
      .mockResolvedValueOnce(springPage([traceRow('0123456789abcdef0123456789abcdef')]));
    await loadMetricSignal({ signal: 'metrics', timeRange: 'last-15m', query: 'up' }, signal);
    await loadLogSignal({ signal: 'logs', timeRange: 'last-15m', pageIndex: 0 }, signal);
    await loadTraceSignal({ signal: 'traces', timeRange: 'last-15m', pageIndex: 0 }, signal);
    expect(apiMessageGet).toHaveBeenCalledTimes(3);
    expect(
      apiMessageGet.mock.calls.every((call: unknown[]) => (call[1] as { signal: AbortSignal }).signal === signal)
    ).toBe(true);
  });

  it('requires explicit metric selection without querying inventory or a hidden first console metric', async () => {
    const signal = new AbortController().signal;

    await expect(loadMetricSignal({ signal: 'metrics', timeRange: 'last-15m' }, signal)).resolves.toMatchObject({
      kind: 'selection_required'
    });
    expect(apiMessageGet).not.toHaveBeenCalled();
  });

  it('fetches an honest bounded inventory with literal remote search and abort support', async () => {
    const signal = new AbortController().signal;
    const response = { context: null, source: 'greptime-inventory', limit: 100, truncated: false, items: [] };
    apiMessageGet.mockResolvedValueOnce(response);
    await expect(
      loadMetricInventory({ signal: 'metrics', timeRange: 'last-15m', start: 1000, end: 2000 }, ' cpu_% ', signal)
    ).resolves.toEqual(response);
    const path = new URL(String(apiMessageGet.mock.calls[0]?.[0]), 'http://localhost');
    expect(Object.fromEntries(path.searchParams)).toEqual({
      start: '1000',
      end: '2000',
      limit: '100',
      search: 'cpu_%'
    });
    expect(apiMessageGet.mock.calls[0]?.[1]).toEqual({ signal });
  });

  it('keeps log overview and trend failures independent from a valid page', async () => {
    const signal = new AbortController().signal;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_754_468_100_000);
    apiMessageGet
      .mockResolvedValueOnce(stableLogPage([logRow('valid')]))
      .mockRejectedValueOnce(new Error('overview unavailable'))
      .mockResolvedValueOnce({
        start: 1_754_467_200_000,
        end: 1_754_468_100_000,
        intervalMs: 60_000,
        buckets: [{ start: 1_754_467_200_000, count: 4 }]
      });

    await expect(
      loadLogHistoryEvidence({ signal: 'logs', timeRange: 'last-15m', query: 'timeout' }, signal)
    ).resolves.toEqual({
      page: expect.objectContaining({ totalElements: 1 }),
      overview: { kind: 'error' },
      trend: {
        kind: 'ready',
        data: {
          start: 1_754_467_200_000,
          end: 1_754_468_100_000,
          intervalMs: 60_000,
          buckets: [{ start: 1_754_467_200_000, count: 4 }]
        }
      }
    });
    expect(apiMessageGet.mock.calls.map(call => String(call[0]))).toEqual([
      expect.stringContaining('/api/logs/list?'),
      expect.stringContaining('/api/logs/stats/overview?'),
      expect.stringContaining('/api/logs/stats/trend?')
    ]);
    expect(apiMessageGet.mock.calls.every(call => call[1]?.signal === signal)).toBe(true);
    nowSpy.mockRestore();
  });

  it('loads only source scoped log statistics for an exact shifted timeline window', async () => {
    apiMessageGet.mockRejectedValueOnce(new Error('overview unavailable')).mockResolvedValueOnce({
      start: 1_754_467_200_000,
      end: 1_754_468_100_000,
      intervalMs: 60_000,
      buckets: [{ start: 1_754_467_200_000, count: 1 }]
    });
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      serviceName: 'shared-service',
      query: '@event.name:source',
      searchSyntax: 'structured-v1',
      start: 1_754_467_200_000,
      end: 1_754_468_100_000
    };

    await expect(loadLogStatistics(query)).resolves.toMatchObject({
      overview: { kind: 'error' },
      trend: { kind: 'ready', data: { start: 1_754_467_200_000, end: 1_754_468_100_000 } }
    });
    expect(apiMessageGet).toHaveBeenCalledTimes(2);
    const paths = apiMessageGet.mock.calls.map(call => String(call[0]));
    expect(paths).toEqual([
      expect.stringContaining(
        '/api/logs/stats/overview?serviceName=shared-service&start=1754467200000&end=1754468100000'
      ),
      expect.stringContaining('/api/logs/stats/trend?serviceName=shared-service&start=1754467200000&end=1754468100000')
    ]);
    expect(paths.every(path => path.includes('search=%40event.name%3Asource'))).toBe(true);
  });

  it('rejects trend evidence for a different relative request window', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_754_468_100_000);
    apiMessageGet
      .mockResolvedValueOnce(stableLogPage([logRow('valid')]))
      .mockRejectedValueOnce(new Error('overview unavailable'))
      .mockResolvedValueOnce({
        start: 1_754_467_200_001,
        end: 1_754_468_100_000,
        intervalMs: 60_000,
        buckets: []
      });

    const evidence = await loadLogHistoryEvidence({ signal: 'logs', timeRange: 'last-15m' });

    expect(evidence.trend).toEqual({ kind: 'error' });
    nowSpy.mockRestore();
  });

  it('rejects trend evidence for a different exact request window', async () => {
    apiMessageGet
      .mockResolvedValueOnce(stableLogPage([logRow('valid')]))
      .mockRejectedValueOnce(new Error('overview unavailable'))
      .mockResolvedValueOnce({
        start: 1_754_467_200_000,
        end: 1_754_468_100_001,
        intervalMs: 60_000,
        buckets: []
      });

    const evidence = await loadLogHistoryEvidence({
      signal: 'logs',
      timeRange: 'last-15m',
      start: 1_754_467_200_000,
      end: 1_754_468_100_000
    });

    expect(evidence.trend).toEqual({ kind: 'error' });
  });

  it('captures one relative window for delayed page, overview and trend and publishes statistics atomically', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const page = deferredStatistics<ReturnType<typeof stableLogPage>>();
    const overview = deferredStatistics<ReturnType<typeof overviewFixture>>();
    const trend = deferredStatistics<ReturnType<typeof trendFixture>>();
    apiMessageGet
      .mockReturnValueOnce(page.promise)
      .mockReturnValueOnce(overview.promise)
      .mockReturnValueOnce(trend.promise);
    const scope = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      query: 'timeout'
    };
    let published = false;
    const load = loadLogHistoryEvidence(scope).then(value => {
      published = true;
      return value;
    });
    try {
      clock.mockReturnValue(2_000_000);
      page.resolve(stableLogPage([logRow('valid')]));
      await vi.waitFor(() => expect(apiMessageGet).toHaveBeenCalledTimes(3));
      for (const [path] of apiMessageGet.mock.calls) {
        const params = new URL(String(path), 'http://fixture').searchParams;
        expect(Object.fromEntries(params)).toMatchObject({
          start: '100000',
          end: '1000000',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          environment: 'prod',
          search: 'timeout'
        });
      }
      trend.resolve(trendFixture());
      await trend.promise;
      expect(published).toBe(false);
      overview.resolve(overviewFixture());
      await expect(load).resolves.toMatchObject({
        overview: { kind: 'ready' },
        trend: { kind: 'ready', data: { start: 100000, end: 1000000 } }
      });
    } finally {
      clock.mockRestore();
    }
  });

  it('rejects cancelled statistics even when late transport success ignores abort', async () => {
    const overview = deferredStatistics<ReturnType<typeof overviewFixture>>();
    const trend = deferredStatistics<ReturnType<typeof trendFixture>>();
    apiMessageGet.mockReturnValueOnce(overview.promise).mockReturnValueOnce(trend.promise);
    const abort = new AbortController();
    const load = loadLogStatistics(
      { signal: 'logs', timeRange: 'last-15m', start: 100000, end: 1000000 },
      abort.signal
    );
    const rejected = expect(load).rejects.toMatchObject({ name: 'AbortError' });
    abort.abort(new DOMException('Aborted', 'AbortError'));
    overview.resolve(overviewFixture());
    trend.resolve(trendFixture());
    await rejected;
    expect(apiMessageGet.mock.calls.every(call => call[1]?.signal === abort.signal)).toBe(true);
  });

  it('does not turn aborted log statistics into cacheable partial evidence', async () => {
    const controller = new AbortController();
    apiMessageGet.mockResolvedValueOnce(stableLogPage([logRow('valid')])).mockImplementation(
      (_path: string, request: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
            once: true
          });
        })
    );

    const pending = loadLogHistoryEvidence({ signal: 'logs', timeRange: 'last-15m' }, controller.signal);
    await vi.waitFor(() => expect(apiMessageGet).toHaveBeenCalledTimes(3));
    controller.abort(new DOMException('Aborted', 'AbortError'));

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('keeps missing, transport, contract, and other failures distinct', () => {
    expect(classifyExploreSignalError(new ExploreSignalMissingError())).toBe('missing');
    expect(classifyExploreSignalError(new ApiMessageError('unauthorized', { status: 401 }))).toBe('permission');
    expect(classifyExploreSignalError(new ApiMessageError('forbidden', { status: 403 }))).toBe('permission');
    expect(classifyExploreSignalError(new ApiMessageError('offline', { status: 503 }))).toBe('transport_error');
    expect(classifyExploreSignalError(new ExploreSignalContractError('bad'))).toBe('contract_error');
    expect(classifyExploreSignalError(new Error('bad'))).toBe('error');
  });

  it('parses stream events at the API boundary and reports malformed payloads without values', async () => {
    apiMessageGet.mockResolvedValueOnce(null);
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
    await vi.waitFor(() => expect(openBrowserEventStream).toHaveBeenCalledOnce());
    const transportHandlers = openBrowserEventStream.mock.calls[0]?.[1] as
      | {
          onEvent: (name: string, data: string) => void;
        }
      | undefined;

    transportHandlers?.onEvent('LOG_EVENT', JSON.stringify(liveLogRow('valid')));
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

function stableLogPage(content: unknown[]) {
  return { content, totalElements: content.length, pageIndex: 0, pageSize: 20 };
}

function traceRow(traceId: string) {
  return {
    rootState: 'missing',
    rootSpanCount: 0,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: null,
      serviceName: null,
      serviceNamespace: null,
      startTime: 1_750_000_001_000,
      durationNanos: 1_000_000
    },
    observedStartTime: 1_750_000_001_000,
    observedEndTime: 1_750_000_001_000 + Math.ceil(1_000_000 / 1_000_000),
    unattributedServiceStats: null,
    traceId,
    rootSpanId: null,
    serviceName: null,
    serviceNamespace: null,
    rootSpanName: null,
    durationNanos: null,
    status: null,
    startTime: null,
    errorSpanCount: 0,
    spanCount: 1,
    serviceStats: { checkout: { spanCount: 1, errorCount: 0 } },
    resourceAttributes: null
  };
}

function logRow(body: string) {
  return {
    logRecordUid: 'event-1',
    timeUnixNano: '1750000000000000000',
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

function liveLogRow(body: string) {
  const row = logRow(body);
  return {
    timeUnixNano: 1_750_000_000_000_000_000,
    observedTimeUnixNano: row.observedTimeUnixNano,
    severityNumber: row.severityNumber,
    severityText: row.severityText,
    body: row.body,
    attributes: row.attributes,
    droppedAttributesCount: row.droppedAttributesCount,
    traceId: row.traceId,
    spanId: row.spanId,
    traceFlags: row.traceFlags,
    resource: row.resource,
    resourceSchemaUrl: row.resourceSchemaUrl,
    instrumentationScope: row.instrumentationScope,
    scopeSchemaUrl: row.scopeSchemaUrl
  };
}

function deferredStatistics<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
function overviewFixture() {
  return { totalCount: 1, traceCount: 0, debugCount: 0, infoCount: 1, warnCount: 0, errorCount: 0, fatalCount: 0 };
}
function trendFixture() {
  return { start: 100000, end: 1000000, intervalMs: 60000, buckets: [{ start: 120000, count: 1 }] };
}

it.each([401, 403, 500].flatMap(status => ['overview', 'trend'].map(failed => [status, failed] as const)))(
  'retains ordinary history sibling evidence for HTTP%s %s failure',
  async (status, failed) => {
    apiMessageGet.mockReset();
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      start: 1000,
      end: 2000,
      serviceName: 'checkout'
    };
    const overview = {
      totalCount: 9,
      traceCount: 0,
      debugCount: 0,
      infoCount: 9,
      warnCount: 0,
      errorCount: 0,
      fatalCount: 0
    };
    const trend = { start: 1000, end: 2000, intervalMs: 60000, buckets: [{ start: 0, count: 9 }] };
    apiMessageGet.mockResolvedValueOnce(stableLogPage([logRow('valid')]));
    apiMessageGet.mockImplementation(path =>
      String(path).includes(`/stats/${failed}?`)
        ? Promise.reject(new ApiMessageError('Synthetic private server text', { status }))
        : Promise.resolve(failed === 'overview' ? trend : overview)
    );
    const result = await loadLogHistoryEvidence(query);
    expect(result.page.totalElements).toBe(1);
    expect(result[failed as 'overview' | 'trend']).toEqual(
      status === 500 ? { kind: 'error' } : { kind: 'error', reason: 'permission' }
    );
    expect(result[failed === 'overview' ? 'trend' : 'overview']).toEqual({
      kind: 'ready',
      data: failed === 'overview' ? trend : overview
    });
    expect(apiMessageGet).toHaveBeenCalledTimes(3);
    expect(apiMessageGet.mock.calls.every(call => String(call[0]).includes('start=1000&end=2000'))).toBe(true);
  }
);

it.each([401, 403, 500].flatMap(status => ['overview', 'trend'].map(failed => [status, failed] as const)))(
  'keeps selected-source statistics scoped and partial for HTTP%s %s',
  async (status, failed) => {
    apiMessageGet.mockReset();
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-15m' as const,
      start: 1000,
      end: 2000,
      serviceName: 'checkout',
      query: '@event.name:source-a',
      searchSyntax: 'structured-v1'
    };
    const overview = overviewFixture();
    const trend = { start: 1000, end: 2000, intervalMs: 60000, buckets: [{ start: 0, count: 1 }] };
    apiMessageGet.mockImplementation(path =>
      String(path).includes(`/stats/${failed}?`)
        ? Promise.reject(new ApiMessageError('Synthetic private server text', { status }))
        : Promise.resolve(failed === 'overview' ? trend : overview)
    );
    const abort = new AbortController();
    const result = await loadLogStatistics(query, abort.signal);
    expect(result[failed as 'overview' | 'trend']).toEqual(
      status === 500 ? { kind: 'error' } : { kind: 'error', reason: 'permission' }
    );
    expect(result[failed === 'overview' ? 'trend' : 'overview']).toEqual({
      kind: 'ready',
      data: failed === 'overview' ? trend : overview
    });
    expect(apiMessageGet).toHaveBeenCalledTimes(2);
    for (const [path, request] of apiMessageGet.mock.calls) {
      const params = new URL(String(path), 'http://local').searchParams;
      expect(Object.fromEntries(params)).toMatchObject({
        serviceName: 'checkout',
        start: '1000',
        end: '2000',
        search: '@event.name:source-a',
        searchSyntax: 'structured-v1'
      });
      expect(request?.signal).toBe(abort.signal);
    }
  }
);
