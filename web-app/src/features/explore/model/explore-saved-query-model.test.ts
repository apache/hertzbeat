/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';

import { buildSignalApiPath } from '../api/explore-api';
import { buildExplorePath, parseExploreQuery, presetTimeRangePatch, mergeExploreQuery } from './explore-model';
import { buildSavedQueryPayload, readSavedQuery, type SavedQueryRecord } from './explore-saved-query-model';
import { savedQueryConditions } from './explore-saved-query-model';
import type { ExploreQuery } from './explore-query';

const identity = { serviceName: 'checkout', serviceNamespace: 'payments', environment: 'test', instance: 'java-1' };
const record = (signal: SavedQueryRecord['signal'], route: string, payload?: string): SavedQueryRecord => ({
  signal,
  viewKey: 'test-view',
  label: 'Saved query',
  route,
  ...(payload ? { payload } : {})
});

describe('saved query persistence contract', () => {
  it('retains invalid category input for rejection rather than silently removing its filter', () => {
    const query = parseExploreQuery(new URLSearchParams('signal=logs&severityCategory=NOT_A_CATEGORY'));
    expect(query).toMatchObject({ severityCategory: 'NOT_A_CATEGORY' });
    expect(new URL(buildSignalApiPath(query, 10_000_000), 'http://local').searchParams.get('severityCategory')).toBe(
      'NOT_A_CATEGORY'
    );
    expect(() => buildSavedQueryPayload(query, 'invalid', 'Invalid category', '')).toThrow(
      'Invalid saved query conditions'
    );
  });
  it('round trips canonical severity category search independently from original severity text', () => {
    const query = parseExploreQuery(new URLSearchParams('signal=logs&severityCategory=ERROR&severityText=SEVERE'));
    expect(query).toMatchObject({
      query: 'status:"ERROR"',
      searchSyntax: 'structured-v1',
      severityCategory: undefined,
      severityText: 'SEVERE'
    });
    const saved = buildSavedQueryPayload(query, 'category', 'Errors', '');
    expect(readSavedQuery(saved)).toMatchObject({
      kind: 'ready',
      query: {
        query: 'status:"ERROR"',
        searchSyntax: 'structured-v1',
        severityCategory: undefined,
        severityText: 'SEVERE'
      }
    });
    const params = new URL(buildSignalApiPath(query, 10_000_000), 'http://local').searchParams;
    expect(params.get('severityCategory')).toBeNull();
    expect(params.get('search')).toBe('status:"ERROR"');
    expect(params.get('searchSyntax')).toBe('structured-v1');
    const reopened = readSavedQuery(saved);
    if (reopened.kind !== 'ready') throw new Error('Expected restored query');
    expect(buildSignalApiPath(reopened.query, 10_000_000)).toBe(buildSignalApiPath(query, 10_000_000));
    expect(params.get('severityText')).toBe('SEVERE');
  });
  it('rejects a valid query whose serialized UTF-8 payload exceeds the shared storage bound', () => {
    const query = { signal: 'logs', timeRange: 'last-30m', query: 'é'.repeat(40_000) } as const;
    expect(JSON.stringify({ version: 1, query }).length).toBeLessThan(65_535);
    expect(() => buildSavedQueryPayload(query, 'bytes', 'Byte bound', '')).toThrow('Saved query is too long');
  });

  it.each(['x', 'é'])('preserves an exact 65,535-byte %s payload and rejects one more byte', character => {
    const query = { signal: 'logs', timeRange: 'last-30m', query: 'x'.repeat(8192) } as const;
    const bytes = (value: string) => new TextEncoder().encode(value).length;
    const overhead = bytes(JSON.stringify({ version: 1, query: savedQueryConditions(query) })) - 8192;
    const remaining = 65_535 - overhead;
    const exact = character.repeat(Math.floor(remaining / bytes(character))) + 'x'.repeat(remaining % bytes(character));
    const request = buildSavedQueryPayload({ ...query, query: exact }, 'bytes', 'Byte bound', '');
    expect(bytes(request.payload!)).toBe(65_535);
    expect(readSavedQuery(request)).toMatchObject({ kind: 'ready', query: { query: exact } });
    expect(() => buildSavedQueryPayload({ ...query, query: exact + 'x' }, 'bytes', 'Byte bound', '')).toThrow(
      'Saved query is too long'
    );
  });

  it('matches the backend description trimming before verifying the persisted response', () => {
    expect(
      buildSavedQueryPayload({ signal: 'logs', timeRange: 'last-30m' }, 'trimmed', ' Name ', ' Details ').description
    ).toBe('Details');
  });
  it.each(['metrics', 'logs', 'traces'] as const)(
    'retains a relative %s query through the real transport boundary',
    signal => {
      const query = parseExploreQuery(
        new URLSearchParams({ signal, timeRange: 'last-1h', ...identity, query: 'checkout' })
      );
      const request = buildSavedQueryPayload(query, 'view-1', 'Checkout', 'Shared query');
      const restored = readSavedQuery(request);
      expect(restored.kind).toBe('ready');
      if (restored.kind !== 'ready') return;
      expect(restored.query).toEqual(query);
      expect(new URL(buildSignalApiPath(restored.query, 10_000_000), 'http://local').searchParams.get('start')).toBe(
        '6400000'
      );
      expect(new URL(buildSignalApiPath(restored.query, 20_000_000), 'http://local').searchParams.get('start')).toBe(
        '16400000'
      );
      expect(request.route).toBe(`/explore?signal=${signal}`);
    }
  );

  it('preserves explicit relative entity scope without converting it to a frozen investigation', () => {
    const exact = parseExploreQuery(
      new URLSearchParams('signal=traces&entityId=7&start=1000000&end=1060000&timeZone=UTC')
    );
    const preset = mergeExploreQuery(exact, presetTimeRangePatch(exact, 'last-1h'));
    const restored = readSavedQuery(buildSavedQueryPayload(preset, 'relative-entity', 'Entity', ''));
    expect(restored.kind).toBe('ready');
    if (restored.kind !== 'ready') return;
    const reopened = parseExploreQuery(new URL(buildExplorePath(restored.query), 'http://local').searchParams);
    expect(buildSignalApiPath(reopened, 10_000_000)).toContain('entityId=7');
    expect(buildSignalApiPath(reopened, 10_000_000)).toContain('start=6400000&end=10000000');
  });

  it.each([
    [
      'logs',
      '/log/manage?search=timeout&severityText=ERROR&timeRange=last-1h',
      { query: 'timeout', severityText: 'ERROR' }
    ],
    [
      'traces',
      '/trace/manage?operationName=GET+%2Ffailure&errorOnly=true&timeRange=last-1h',
      { query: 'GET /failure', errorOnly: true }
    ],
    [
      'metrics',
      '/ingestion/otlp/metrics?query=jvm.memory.used&filter=region%3Dtest&timeRange=last-1h',
      { query: 'jvm.memory.used', metricFilter: 'region=test' }
    ]
  ] as const)('converts the complete legacy %s query', (signal, route, expected) => {
    const original = { ...record(signal, route, JSON.stringify({ createdAt: 1234 })), querySnapshot: route };
    const result = readSavedQuery(original);
    expect(result).toMatchObject({
      kind: 'ready',
      legacy: true,
      query: signal === 'logs' ? { ...expected, query: '"timeout"', searchSyntax: 'structured-v1' } : expected
    });
    expect(original.route).toBe(route);
  });

  it.each([
    '/log/manage?search=timeout&groupBy=severityText',
    '/log/manage?search=timeout&query=different',
    '/log/manage?search=timeout&search=other',
    '/log/manage?start=broken&end=broken',
    '/log/manage?timeRange=last-7d'
  ])('retains an unrepresentable legacy record: %s', route => {
    const original = record('logs', route);
    expect(readSavedQuery(original).kind).toBe('unavailable');
    expect(original.route).toBe(route);
  });

  it('never recovers an invalid or future payload using a broader route or snapshot', () => {
    for (const payload of [
      '{broken',
      '{"version":2,"query":{}}',
      '{"version":1,"query":{"signal":"logs","timeRange":"last-1h","futureFilter":"secret"}}'
    ]) {
      expect(readSavedQuery(record('logs', '/explore?signal=logs', payload)).kind).toBe('unavailable');
    }
  });

  it.each([
    ['traces', '/trace/manage?sort=newest&errorOnly=false'],
    ['logs', '/log/manage?mode=history&hideInternal=false&hideNoise=false'],
    ['metrics', '/ingestion/otlp/metrics?query=cpu&temporalAggregation=raw']
  ] as const)('converts supported explicit defaults for %s', (signal, route) => {
    expect(readSavedQuery(record(signal, route)).kind).toBe('ready');
  });

  it('rejects a V1 exact window with a refresh field that normalization would silently discard', () => {
    const payload = JSON.stringify({
      version: 1,
      query: {
        signal: 'metrics',
        timeRange: 'last-30m',
        query: 'cpu',
        start: 1000000,
        end: 1060000,
        timeZone: 'UTC',
        autoRefreshMs: 30000
      }
    });
    expect(readSavedQuery(record('metrics', '/explore?signal=metrics', payload)).kind).toBe('unavailable');
  });

  it.each([
    {
      signal: 'metrics',
      operationName: 'GET /checkout',
      metricFilter: 'region=test',
      groupBy: 'host',
      aggregation: 'avg',
      temporalAggregation: 'rate',
      step: '60',
      autoRefreshMs: 30000,
      windowMode: 'preset'
    },
    {
      signal: 'logs',
      traceId: '1234567890abcdef1234567890abcdef',
      spanId: '1234567890abcdef',
      logRecordUid: 'record-1',
      severityText: 'ERROR',
      resourceFilter: 'region=test',
      attributeFilter: 'http.method=GET',
      hideInternal: true,
      hideNoise: true,
      start: 1750000000000,
      end: 1750000060000,
      timeZone: 'UTC'
    },
    {
      signal: 'traces',
      traceId: '1234567890abcdef1234567890abcdef',
      spanId: '1234567890abcdef',
      errorOnly: true,
      sort: 'duration_desc',
      resourceFilter: 'region=test',
      attributeFilter: 'http.method=GET',
      spanScope: 'root',
      hideInternal: true,
      minDurationMs: 0,
      maxDurationMs: 300,
      start: 1750000000000,
      end: 1750000060000,
      timeZone: 'UTC'
    }
  ] as const)(
    'round-trips all supported $signal conditions without sharing navigation or result position',
    signalFields => {
      const query = {
        timeRange: 'last-1h',
        ...identity,
        entityId: '7',
        monitorId: '3',
        intakeProfileId: 'java',
        collectorId: 'collector',
        endpoint: '/checkout',
        query: 'request',
        ...signalFields,
        savedView: 'old',
        pageIndex: 2
      } as ExploreQuery;
      const request = buildSavedQueryPayload(query, 'complete', 'Complete', '');
      const restored = readSavedQuery(request);
      expect(restored).toMatchObject({ kind: 'ready', query: savedQueryConditions(query) });
      const data = JSON.parse(request.payload!) as { query: Record<string, unknown> };
      expect(data.query).not.toHaveProperty('savedView');
      expect(data.query).not.toHaveProperty('pageIndex');
      if (restored.kind === 'ready') {
        const before = new URL(buildSignalApiPath(savedQueryConditions(query), 1750100000000), 'https://local')
          .searchParams;
        const after = new URL(buildSignalApiPath(restored.query, 1750100000000), 'https://local').searchParams;
        expect([...after]).toEqual([...before]);
      }
    }
  );

  it.each([
    { entityId: '7', windowMode: 'preset', start: 1000 },
    { entityId: '7', windowMode: 'preset', collectorId: 'partial' },
    { monitorId: '3', windowMode: 'preset' },
    { entityId: '7', monitorId: '3', windowMode: 'preset' },
    { entityId: '7' }
  ])('does not use saved-view identity to allow incomplete context: %o', partial => {
    const payload = JSON.stringify({ version: 1, query: { signal: 'metrics', timeRange: 'last-30m', ...partial } });
    expect(readSavedQuery(record('metrics', '/explore?signal=metrics', payload)).kind).toBe('unavailable');
  });
});
