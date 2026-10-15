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

import { parseExploreQuery } from './explore-model';
import { exploreHandoffState } from './explore-query';
import {
  buildLogInvestigationPath,
  buildTraceInvestigationPath,
  exploreInvestigationRoute,
  investigationDurationNanoToMillis
} from './explore-investigation-model';
import { normalizeExploreReturnTo } from './explore-url-model';

it('retains a span-only exact list return path without treating it as a focused trace', () => {
  const list = '/explore?signal=traces&timeRange=last-30m&spanId=0123456789abcdef&start=1000&end=2000';
  expect(normalizeExploreReturnTo(list)).toBe(list);
});

const sourceWindow = { from: 1_720_000_000_000, to: 1_720_003_600_000 };

describe('focused trace return route', () => {
  it('restores a relative trace-ID filter without silently dropping its filter or inventing frozen evidence', () => {
    const list = '/explore?signal=traces&timeRange=last-30m&traceId=0123456789abcdef0123456789abcdef&page=2';
    const source = parseExploreQuery(new URL(list, 'https://example.test').searchParams);
    const path = buildTraceInvestigationPath(
      source,
      {
        traceId: '0123456789abcdef0123456789abcdef',
        startTime: null,
        durationNanos: null,
        observedStartTime: sourceWindow.from,
        observedEndTime: sourceWindow.to
      },
      sourceWindow,
      'UTC'
    );
    expect(new URL(path, 'https://example.test').searchParams.get('returnTo')).toBe(list);
    expect(normalizeExploreReturnTo(list)).toBe(list);
  });
  it('keeps a bounded canonical list return route and rejects external, recursive and focused routes', () => {
    const list =
      '/explore?signal=traces&timeRange=last-30m&page=2&start=1720000000000&end=1720003600000&serviceName=checkout';
    expect(normalizeExploreReturnTo(list)).toBe(list);
    for (const invalid of [
      'https://evil.test/explore',
      '//evil.test/explore',
      list + '&returnTo=' + encodeURIComponent(list),
      list + '&traceId=0123456789abcdef0123456789abcdef',
      list + '&unknown=1',
      list + '#fragment'
    ]) {
      expect(normalizeExploreReturnTo(invalid)).toBeUndefined();
    }
  });

  it('preserves the original frozen list context while investigating a span outside the original list window', () => {
    const query = parseExploreQuery(new URLSearchParams('signal=traces&page=2&serviceName=checkout'));
    const path = buildTraceInvestigationPath(
      query,
      {
        traceId: '0123456789abcdef0123456789abcdef',
        startTime: null,
        durationNanos: null,
        observedStartTime: sourceWindow.from - 60_000,
        observedEndTime: sourceWindow.to + 60_000
      },
      sourceWindow,
      'UTC'
    );
    const params = new URL(path, 'https://example.test').searchParams;
    expect(params.get('start')).toBe(String(sourceWindow.from - 90_000));
    expect(params.get('end')).toBe(String(sourceWindow.to + 90_000));
    expect(normalizeExploreReturnTo(params.get('returnTo'))).toContain('page=2');
    expect(params.get('returnTo')).toContain('start=' + sourceWindow.from);
  });
});

describe('Explore investigation route ownership', () => {
  it('accepts only a complete bounded exact Trace anchor', () => {
    const ready = parseExploreQuery(
      new URLSearchParams(
        'signal=traces&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef&start=1720000000000&end=1720000060000' +
          '&timeZone=Asia%2FShanghai&entityId=7&serviceName=checkout'
      )
    );

    expect(exploreInvestigationRoute(ready)).toEqual({
      kind: 'trace',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      window: { from: 1_720_000_000_000, to: 1_720_000_060_000, timeZone: 'Asia/Shanghai' }
    });
    expect(exploreHandoffState(ready)).toBe('scoped');

    for (const evidence of [
      'start=1720000000000&timeZone=UTC',
      'start=1720000060000&end=1720000000000&timeZone=UTC',
      'start=1720000000000&end=1720086400001&timeZone=UTC',
      'start=1720000000000&end=1720000060000&timeZone=Not%2FAZone'
    ]) {
      const query = parseExploreQuery(
        new URLSearchParams(`signal=traces&traceId=0123456789abcdef0123456789abcdef&${evidence}`)
      );
      expect(exploreInvestigationRoute(query)).toEqual({ kind: 'invalid', signal: 'traces' });
    }
  });

  it('keeps traceId-only searches generic but treats every selected Log as route-owned', () => {
    expect(
      exploreInvestigationRoute(parseExploreQuery(new URLSearchParams('signal=traces&traceId=trace-filter')))
    ).toEqual({ kind: 'inactive' });

    for (const route of [
      'signal=logs&logRecordUid=01J7ZX',
      'signal=logs&logRecordUid=%20',
      `signal=logs&logRecordUid=${'x'.repeat(257)}&start=1000&end=2000&timeZone=UTC`,
      'signal=logs&mode=live&logRecordUid=01J7ZX&start=1000&end=2000&timeZone=UTC'
    ]) {
      expect(exploreInvestigationRoute(parseExploreQuery(new URLSearchParams(route)))).toEqual({
        kind: 'invalid',
        signal: 'logs'
      });
    }
  });

  it('round-trips a safe opaque selected Log UID without interpreting it as a timestamp', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&logRecordUid=01J7ZX_ab%3Acd&start=1720000000000&end=1720000600000' +
          '&timeZone=America%2FNew_York&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef'
      )
    );

    expect(query).toMatchObject({ signal: 'logs', logRecordUid: '01J7ZX_ab:cd' });
    expect(exploreInvestigationRoute(query)).toEqual({
      kind: 'log',
      logRecordUid: '01J7ZX_ab:cd',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      window: { from: 1_720_000_000_000, to: 1_720_000_600_000, timeZone: 'America/New_York' }
    });
  });

  it.each([
    '0123456789abcdef0123456789abcde',
    '0123456789abcdef0123456789abcdef0',
    '0123456789abcdef0123456789abcdeg',
    '0123456789ABCDEF0123456789ABCDEF'
  ])('rejects non-canonical focused Trace identity %s', invalidTraceId => {
    const query = parseExploreQuery(
      new URLSearchParams(`signal=traces&traceId=${invalidTraceId}&start=1000&end=2000&timeZone=UTC`)
    );
    expect(exploreInvestigationRoute(query)).toEqual({ kind: 'invalid', signal: 'traces' });
    expect(exploreHandoffState(query)).toBe('invalid');
  });

  it('rejects non-canonical optional Trace hints on selected Logs', () => {
    for (const hints of [
      'traceId=0123456789ABCDEF0123456789ABCDEF',
      'traceId=0123456789abcdef0123456789abcdeg',
      'spanId=0123456789abcde',
      'spanId=0123456789abcdeG'
    ]) {
      const query = parseExploreQuery(
        new URLSearchParams(`signal=logs&logRecordUid=record-1&start=1000&end=2000&timeZone=UTC&${hints}`)
      );
      expect(exploreInvestigationRoute(query)).toEqual({ kind: 'invalid', signal: 'logs' });
      expect(exploreHandoffState(query)).toBe('invalid');
    }
  });
});

describe('Explore investigation selection windows', () => {
  it('derives display milliseconds from duration nanoseconds without parsing the raw integer as Number', () => {
    expect(investigationDurationNanoToMillis('90000000123')).toBe(90_000.000123);
    expect(investigationDurationNanoToMillis('18446744073709551616')).toBeUndefined();
    expect(investigationDurationNanoToMillis('01')).toBeUndefined();
  });

  it('refuses to build focused paths from non-canonical Trace and Span identities', () => {
    const traceSource = parseExploreQuery(new URLSearchParams('signal=traces&serviceName=checkout'));
    const logSource = parseExploreQuery(new URLSearchParams('signal=logs&serviceName=checkout'));
    expect(() =>
      buildTraceInvestigationPath(
        traceSource,
        { traceId: 'TRACE-1', selectedSpanId: null, startTime: null, durationNanos: null },
        sourceWindow,
        'UTC'
      )
    ).toThrow(/trace identity/i);
    expect(() =>
      buildLogInvestigationPath(
        logSource,
        { logRecordUid: 'record-1', timeUnixNano: null, spanId: '0123456789abcdeG' },
        sourceWindow,
        'UTC'
      )
    ).toThrow(/identity/i);
  });

  it('preserves a committed absolute source window when opening a Trace', () => {
    const path = buildTraceInvestigationPath(
      parseExploreQuery(
        new URLSearchParams(
          'signal=traces&serviceName=checkout&entityId=7&start=1720000000000&end=1720003600000&timeZone=UTC'
        )
      ),
      {
        traceId: '0123456789abcdef0123456789abcdef',
        selectedSpanId: '0123456789abcdef',
        startTime: 1_720_000_010_000,
        durationNanos: 90_000_000_000
      },
      sourceWindow,
      'Asia/Shanghai'
    );

    const comparison = new URL(path, 'https://example.test');
    comparison.searchParams.delete('returnTo');
    expect(comparison.pathname + comparison.search).toBe(
      '/explore?signal=traces&timeRange=last-30m&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef' +
        '&start=1720000000000&end=1720003600000&timeZone=UTC&entityId=7&serviceName=checkout'
    );
  });

  it('preserves the log list filters, page and absolute window for the return path', () => {
    const source = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&query=timeout&severityText=ERROR&page=3&start=1720000000000&end=1720003600000&timeZone=UTC'
      )
    );
    const path = buildLogInvestigationPath(
      source,
      { logRecordUid: 'event-7', timeUnixNano: '1720000060000000000' },
      sourceWindow,
      'UTC'
    );
    const params = new URL(path, 'https://example.test').searchParams;
    const back = new URL(params.get('returnTo')!, 'https://example.test');
    expect(parseExploreQuery(back.searchParams)).toMatchObject({
      signal: 'logs',
      pageIndex: 3,
      query: '"timeout"',
      searchSyntax: 'structured-v1',
      severityText: 'ERROR',
      start: 1720000000000,
      end: 1720003600000
    });
  });

  it('uses observed bounds for a rootless trace without promoting representative duration to root duration', () => {
    const path = buildTraceInvestigationPath(
      parseExploreQuery(new URLSearchParams('signal=traces&serviceName=checkout&environment=test')),
      {
        traceId: '0123456789abcdef0123456789abcdef',
        selectedSpanId: '0123456789abcdef',
        startTime: null,
        durationNanos: null,
        observedStartTime: 1_720_000_060_000,
        observedEndTime: 1_720_000_090_000
      },
      sourceWindow,
      'UTC'
    );
    const query = new URL(path, 'https://example.test').searchParams;
    expect(query.get('start')).toBe('1720000030000');
    expect(query.get('end')).toBe('1720000120000');
    expect(query.get('serviceName')).toBe('checkout');
    expect(query.get('environment')).toBe('test');
  });

  it('falls back to the trustworthy effective window when Trace timing is missing', () => {
    const path = buildTraceInvestigationPath(
      parseExploreQuery(new URLSearchParams('signal=traces&serviceName=checkout')),
      { traceId: '0123456789abcdef0123456789abcdef', startTime: null, durationNanos: null },
      sourceWindow,
      'Asia/Shanghai'
    );

    expect(path).toContain('start=1720000000000&end=1720003600000&timeZone=Asia%2FShanghai');
  });

  it('derives the selected Log window through decimal arithmetic and never embeds nanoseconds in the route', () => {
    const path = buildLogInvestigationPath(
      parseExploreQuery(new URLSearchParams('signal=logs&serviceName=checkout&entityId=7')),
      {
        logRecordUid: 'record-1',
        timeUnixNano: '1720001800123456789',
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef'
      },
      sourceWindow,
      'Asia/Shanghai'
    );

    const comparison = new URL(path, 'https://example.test');
    comparison.searchParams.delete('returnTo');
    expect(comparison.pathname + comparison.search).toBe(
      '/explore?signal=logs&timeRange=last-30m&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef&searchSyntax=structured-v1&logRecordUid=record-1' +
        '&start=1720001500123&end=1720002100124&timeZone=Asia%2FShanghai&entityId=7&serviceName=checkout'
    );
    expect(path).not.toContain('1720001800123456789');
  });

  it('keeps exact QueryContext and span identity when handing a selected Log to Trace', () => {
    const source = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&logRecordUid=record-1&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef&entityId=7&serviceName=checkout' +
          '&start=1720001500123&end=1720002100124&timeZone=Asia%2FShanghai'
      )
    );
    const path = buildTraceInvestigationPath(
      source,
      {
        traceId: '0123456789abcdef0123456789abcdef',
        selectedSpanId: '0123456789abcdef',
        startTime: null,
        durationNanos: null
      },
      { from: source.start!, to: source.end! },
      'UTC'
    );

    expect(path).toBe(
      '/explore?signal=traces&timeRange=last-30m&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef' +
        '&start=1720001500123&end=1720002100124&timeZone=Asia%2FShanghai&entityId=7&serviceName=checkout'
    );
    expect(path).not.toContain('logRecordUid');
  });
});
