/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { LogExploreQuery, TraceExploreQuery } from './explore-query';
import type { LogInvestigationSnapshot, TraceInvestigationSnapshot } from './explore-investigation-contract';
import {
  createLogInvestigationPersesResults,
  createTraceInvestigationPersesResults
} from './explore-investigation-perses-model';

const window = { from: 1_000, to: 2_000, timeZone: 'UTC' } as const;
const traceId = '0123456789abcdef0123456789abcdef';
const spanId = '0123456789abcdef';
const traceQuery: TraceExploreQuery = {
  signal: 'traces',
  timeRange: 'last-30m',
  traceId,
  spanId,
  start: 1_000,
  end: 2_000,
  timeZone: 'UTC',
  entityId: '7',
  serviceName: 'checkout'
};

describe('Explore investigation Perses adapters', () => {
  it('creates only genuinely ready Trace Gantt, same-trace Log, and metric result props', () => {
    const result = createTraceInvestigationPersesResults(traceQuery, traceSnapshot());

    expect(result.gantt?.query).toMatchObject({
      queryKind: 'gantt',
      traceId,
      spanId,
      timeWindow: { from: window.from, to: window.to }
    });
    expect(result.gantt?.outcome).toMatchObject({
      state: 'ready',
      data: { traceId, spans: [{ traceId, spanId, events: [{ timeUnixNano: '18446744073709551615' }] }] }
    });
    expect(result.logs?.query).toMatchObject({
      queryKind: 'table',
      traceId,
      timeWindow: { from: window.from, to: window.to }
    });
    expect(result.logs?.outcome).toMatchObject({
      state: 'ready',
      truncated: true,
      data: { rows: [{ timeUnixNano: '1787934874782123456' }] }
    });
    expect(result.metrics).toEqual([]);
  });

  it('propagates partial Trace detail to the Perses truncation contract', () => {
    const snapshot = traceSnapshot();
    if (snapshot.gantt.state === 'ready' && snapshot.gantt.detail) snapshot.gantt.detail.partial = true;

    const result = createTraceInvestigationPersesResults(traceQuery, snapshot);

    expect(result.gantt?.outcome).toMatchObject({ state: 'ready', truncated: true });
  });

  it.each([
    { state: 'empty', reason: 'no_data' },
    { state: 'unavailable', reason: 'limit_exceeded' }
  ] as const)('retains same-trace logs with $state Gantt without inventing a Gantt or RED', gantt => {
    const snapshot = traceSnapshot();
    snapshot.gantt = { ...gantt, source: 'greptime_traces', detail: null };
    const result = createTraceInvestigationPersesResults(traceQuery, snapshot);
    expect(result.gantt).toBeUndefined();
    expect(result.logs?.query).toMatchObject({ traceId, timeWindow: { from: 1000, to: 2000 } });
    expect(result.logs?.outcome).toMatchObject({
      state: 'ready',
      data: { rows: [{ body: 'checkout failed', traceId }] }
    });
    expect(result.metrics).toEqual([]);
    expect(snapshot.red).toMatchObject({ state: 'unavailable', summary: null, series: [] });
  });

  it('uses nearby rows for Log-first evidence and does not invent a trace query when uncorrelated', () => {
    const query: LogExploreQuery = {
      signal: 'logs',
      timeRange: 'last-30m',
      logRecordUid: 'event-7',
      start: 1_000,
      end: 2_000,
      timeZone: 'UTC',
      serviceName: 'checkout'
    };
    const result = createLogInvestigationPersesResults(query, logSnapshot());

    expect(result.gantt).toBeUndefined();
    expect(result.logs?.outcome).toMatchObject({
      state: 'ready',
      data: { rows: [{ timeUnixNano: '1787934874781123456' }] }
    });
    expect(result.metrics).toEqual([]);
  });
});

function traceSnapshot(): TraceInvestigationSnapshot {
  return {
    traceId,
    selectedSpanId: spanId,
    window: { start: 1_000, end: 2_000 },
    gantt: { state: 'ready', reason: 'observed', source: 'greptime_traces', detail: traceDetail() },
    sameTraceLogs: {
      state: 'ready',
      reason: 'observed',
      source: 'greptime_logs',
      truncated: true,
      logs: [logRecord('event-7', '1787934874782123456')]
    },
    red: {
      state: 'unavailable',
      reason: 'identity_unavailable',
      source: 'greptime_flow',
      resolutionSeconds: 60,
      identity: null,
      summary: null,
      series: []
    },
    metrics: {
      state: 'unavailable',
      reason: 'query_strategy_unavailable',
      source: 'otlp_metrics',
      truncated: false,
      series: []
    },
    dependencies: { state: 'empty', reason: 'no_data', source: 'greptime_traces', truncated: false, edges: [] }
  };
}

function logSnapshot(): LogInvestigationSnapshot {
  return {
    logRecordUid: 'event-7',
    window: { start: 1_000, end: 2_000 },
    selectedLog: { state: 'ready', reason: 'observed', source: 'greptime_logs', log: logRecord('event-7', '1') },
    trace: { state: 'empty', reason: 'not_correlated', source: 'greptime_traces', detail: null },
    metrics: {
      state: 'unavailable',
      reason: 'query_strategy_unavailable',
      source: 'otlp_metrics',
      truncated: false,
      series: []
    },
    nearbyLogs: {
      state: 'ready',
      reason: 'observed',
      source: 'greptime_logs',
      hasMoreBefore: false,
      hasMoreAfter: false,
      before: [logRecord('event-6', '1787934874781123456')],
      after: []
    }
  };
}

function traceDetail() {
  return {
    partial: false,
    rootState: 'unique' as const,
    rootSpanCount: 1,
    missingParentCount: 0,
    observedStartTime: 1_100,
    observedEndTime: 1_100 + 1,
    representativeSpan: {
      spanId: spanId,
      spanName: 'POST /checkout',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      startTime: 1_100,
      durationNanos: 1_000_000
    },
    rootSpanId: spanId,
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    deploymentEnvironment: 'prod',
    entityId: '7',
    entityType: 'service',
    rootSpanName: 'POST /checkout',
    durationNanos: '1000000',
    status: 'ERROR',
    startTime: 1_100,
    errorSpanCount: 1,
    resourceAttributes: {},
    spans: [
      {
        spanId,
        parentSpanId: null,
        spanName: 'POST /checkout',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        deploymentEnvironment: 'prod',
        entityId: '7',
        entityType: 'service',
        status: 'ERROR',
        statusMessage: 'checkout failed',
        spanKind: 'SERVER',
        traceState: null,
        scopeName: 'checkout',
        scopeVersion: '1.0.0',
        durationNanos: '1000000',
        startTime: 1_100,
        startTimeUnixNano: String(BigInt(1_100) * 1000000n),
        highlighted: true,
        resourceAttributes: {},
        spanAttributes: {},
        events: [
          {
            timeUnixNano: '18446744073709551615',
            name: 'exception',
            attributes: {},
            droppedAttributesCount: 0
          }
        ],
        links: [],
        codeNavigationHint: null
      }
    ]
  };
}

function logRecord(logRecordUid: string, timeUnixNano: string) {
  return {
    logRecordUid,
    timeUnixNano,
    observedTimeUnixNano: null,
    severityNumber: 17,
    severityText: 'ERROR',
    body: 'checkout failed',
    traceId,
    spanId,
    identity: null,
    attributes: {},
    resourceAttributes: {}
  };
}
