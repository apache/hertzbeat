/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';
import { buildExplorePath, parseExploreQuery } from './explore-model';
import { buildSignalApiPath } from '../api/explore-api';
import type { TraceRow } from './explore-signal-contract';
import { traceBackgroundQuery, traceSiblingPaths } from './explore-detail-workspace-model';

const focused = 'signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC';
const parse = (value: string) => parseExploreQuery(new URLSearchParams(value));

describe('Trace detail background context', () => {
  it('uses the frozen source filters, page and window rather than the narrower detail window', () => {
    const source = buildExplorePath(
      parse('signal=traces&serviceName=checkout&errorOnly=true&page=2&sort=duration_desc&start=500&end=3000')
    );
    expect(traceBackgroundQuery(parse(focused + '&returnTo=' + encodeURIComponent(source)))).toMatchObject({
      signal: 'traces',
      serviceName: 'checkout',
      errorOnly: true,
      pageIndex: 2,
      sort: 'duration_desc',
      start: 500,
      end: 3000
    });
  });

  it.each(['https://example.com/explore', '/explore?' + focused, '/explore?signal=logs&mode=live'])(
    'does not create an unsafe or recursive background from %s',
    returnTo => {
      expect(traceBackgroundQuery(parse(focused + '&returnTo=' + encodeURIComponent(returnTo)))).toMatchObject({
        signal: 'traces',
        traceId: undefined,
        spanId: undefined,
        start: 1000,
        end: 2000
      });
    }
  );

  it('preserves a canonical source log category and original severity through detail background', () => {
    const source = buildExplorePath(parse('signal=logs&severityCategory=ERROR&severityText=SEVERE&start=500&end=3000'));
    const restored = traceBackgroundQuery(parse(focused + '&returnTo=' + encodeURIComponent(source)));
    expect(restored).toMatchObject({
      signal: 'logs',
      severityCategory: undefined,
      query: 'status:"ERROR"',
      searchSyntax: 'structured-v1',
      severityText: 'SEVERE',
      start: 500,
      end: 3000
    });
    expect(buildSignalApiPath(restored)).toBe(buildSignalApiPath(parse(source.split('?')[1]!)));
  });

  it('navigates only adjacent rows of the current sorted page and preserves the source page', () => {
    const rows = ['1', '2', '3'].map(id => row(id.repeat(32)));
    const query = parse('signal=traces&sort=duration_desc&page=2&start=1000&end=2000');
    const current = parse('signal=traces&traceId=' + rows[1]!.traceId + '&start=1000&end=2000&timeZone=UTC');
    if (current.signal !== 'traces') throw new Error('Expected traces');
    const result = {
      kind: 'ready' as const,
      signal: 'traces' as const,
      window: { from: 1000, to: 2000 },
      revision: 0,
      data: { content: rows, number: 2, size: 20, totalElements: 43, totalPages: 3 }
    };
    const paths = traceSiblingPaths(query, current, result);
    expect(paths.previous).toContain(rows[0]!.traceId);
    expect(paths.next).toContain(rows[2]!.traceId);
    const next = parse(paths.next!.split('?')[1]!);
    expect(traceBackgroundQuery(next)).toMatchObject({ pageIndex: 2, sort: 'duration_desc', start: 1000, end: 2000 });
    expect(traceSiblingPaths(query, { ...current, traceId: rows[0]!.traceId }, result).previous).toBeUndefined();
    expect(traceSiblingPaths(query, { ...current, traceId: rows[2]!.traceId }, result).next).toBeUndefined();
  });

  it('does not offer sibling navigation from stale, failed or other-signal results', () => {
    expect(traceSiblingPaths(parse('signal=traces'), parse(focused), { kind: 'loading' })).toEqual({});
    expect(traceSiblingPaths(parse('signal=logs'), parse(focused), { kind: 'error' })).toEqual({});
  });
});

function row(traceId: string): TraceRow {
  return {
    traceId,
    rootState: 'unique',
    rootSpanCount: 1,
    rootSpanId: '0123456789abcdef',
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: 'GET /checkout',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      startTime: 1100,
      durationNanos: 5000000
    },
    observedStartTime: 1100,
    observedEndTime: 1105,
    unattributedServiceStats: null,
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    rootSpanName: 'GET /checkout',
    durationNanos: 5000000,
    status: 'ERROR',
    startTime: 1100,
    errorSpanCount: 1,
    resourceAttributes: {},
    spanCount: 1,
    serviceStats: { checkout: { spanCount: 1, errorCount: 1 } }
  };
}
