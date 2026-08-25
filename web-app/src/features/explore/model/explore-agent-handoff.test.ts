/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { materializeLogInvestigation, materializeTraceInvestigation } from './explore-agent-handoff';
import { parseExploreQuery } from './explore-url-model';

describe('Trace Explore Agent handoff', () => {
  it('materializes one exact visible trace detail scope with the effective window', () => {
    expect(
      materializeTraceInvestigation(
        traceQuery(
          'timeRange=last-30m&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
            '&resourceFilter=service.version%3D1&attributeFilter=http.status_code%3D503' +
            '&minDurationMs=10&maxDurationMs=20'
        ),
        { traceId: 'trace-42', spanId: 'span-7' },
        { from: 1_000, to: 2_000 }
      )
    ).toEqual({
      trace: {
        traceId: 'trace-42',
        spanId: 'span-7',
        start: 1_000,
        end: 2_000,
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=503',
        minDurationMs: 10,
        maxDurationMs: 20
      }
    });
  });

  it('uses an explicit route window and rejects scopes the exact trace tool cannot execute', () => {
    expect(
      materializeTraceInvestigation(
        traceQuery('start=3000&end=4000'),
        { traceId: 'trace-42' },
        { from: 1_000, to: 2_000 }
      )
    ).toMatchObject({ trace: { traceId: 'trace-42', start: 3_000, end: 4_000 } });

    expect(materializeTraceInvestigation(traceQuery(''), undefined, { from: 1_000, to: 2_000 })).toBeUndefined();
    expect(
      materializeTraceInvestigation(traceQuery(''), { traceId: 'trace 42' }, { from: 1_000, to: 2_000 })
    ).toBeUndefined();
    expect(
      materializeTraceInvestigation(
        traceQuery(''),
        { traceId: 'trace-42', spanId: 'bad span' },
        { from: 1_000, to: 2_000 }
      )
    ).toBeUndefined();
    expect(
      materializeTraceInvestigation(
        { ...traceQuery(''), minDurationMs: 20, maxDurationMs: 10 },
        { traceId: 'trace-42' },
        { from: 1_000, to: 2_000 }
      )
    ).toBeUndefined();

    for (const search of [
      'errorOnly=true',
      'spanScope=root',
      'hideInternal=true',
      'instance=checkout-1',
      'endpoint=%2Fcheckout',
      'query=POST%20%2Fcheckout',
      'page=2',
      `start=1&end=${7 * 24 * 60 * 60_000 + 2}`
    ]) {
      expect(
        materializeTraceInvestigation(traceQuery(search), { traceId: 'trace-42' }, { from: 1_000, to: 2_000 }),
        search
      ).toBeUndefined();
    }
  });
});

describe('Log Explore Agent handoff', () => {
  it('materializes the exact current non-empty Log page scope with the effective window', () => {
    expect(
      materializeLogInvestigation(
        logQuery(
          'timeRange=last-30m&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
            '&query=timeout&traceId=trace-42&spanId=span-7&severityText=warn' +
            '&resourceFilter=service.version%3D1&attributeFilter=http.status_code%3D503' +
            '&hideInternal=true&hideNoise=true&page=2'
        ),
        { totalElements: 41, number: 2, size: 20, contentCount: 1 },
        { from: 1_000, to: 2_000 }
      )
    ).toEqual({
      log: {
        start: 1_000,
        end: 2_000,
        traceId: 'trace-42',
        spanId: 'span-7',
        severityText: 'WARN',
        search: 'timeout',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=503',
        hideInternal: true,
        hideNoise: true,
        pageIndex: 2,
        pageSize: 20
      }
    });
  });

  it('fails closed without current rows or for scopes the exact Log tool cannot execute', () => {
    const query = logQuery('');
    expect(materializeLogInvestigation(query, undefined, { from: 1_000, to: 2_000 })).toBeUndefined();
    expect(
      materializeLogInvestigation(
        query,
        { totalElements: 0, number: 0, size: 20, contentCount: 0 },
        { from: 1_000, to: 2_000 }
      )
    ).toBeUndefined();
    expect(
      materializeLogInvestigation(
        query,
        { totalElements: 1, number: 0, size: 20, contentCount: 0 },
        { from: 1_000, to: 2_000 }
      )
    ).toBeUndefined();

    for (const search of [
      'mode=live',
      'intakeProfileId=profile-a',
      'collectorId=collector-a',
      'instance=checkout-1',
      'endpoint=%2Fcheckout',
      'severityText=NOTICE',
      'traceId=bad%20trace',
      `start=1&end=${7 * 24 * 60 * 60_000 + 2}`
    ]) {
      expect(
        materializeLogInvestigation(
          logQuery(search),
          { totalElements: 1, number: 0, size: 20, contentCount: 1 },
          { from: 1_000, to: 2_000 }
        ),
        search
      ).toBeUndefined();
    }
  });
});

function traceQuery(search: string) {
  const parsed = parseExploreQuery(new URLSearchParams(`signal=traces&${search}`));
  if (parsed.signal !== 'traces') throw new Error('Expected Trace query');
  return parsed;
}

function logQuery(search: string) {
  const parsed = parseExploreQuery(new URLSearchParams(`signal=logs&${search}`));
  if (parsed.signal !== 'logs') throw new Error('Expected Log query');
  return parsed;
}
