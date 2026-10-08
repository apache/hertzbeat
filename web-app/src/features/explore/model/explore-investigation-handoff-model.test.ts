/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { parseTopologyQuery } from '@/features/topology/model/topology-model';

import type { LogInvestigationSnapshot, TraceInvestigationSnapshot } from './explore-investigation-contract';
import {
  buildLogInvestigationMetricsPath,
  buildLogInvestigationTopologyPath,
  buildTraceInvestigationMetricsPath,
  buildTraceInvestigationTopologyPath
} from './explore-investigation-handoff-model';
import { parseExploreQuery } from './explore-url-model';
import { buildCrossSignalPath, exploreHandoffState, exploreUsesExactWindow } from './explore-model';
import { buildSignalApiPath } from '../api/explore-api';

describe('focused investigation handoffs', () => {
  it('keeps unresolved-service Metrics and same-trace Logs handoffs requestable with the exact intake scope', () => {
    const trace = traceQuery(
      'signal=traces&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef&start=1000&end=2000&timeZone=Asia%2FShanghai&intakeProfileId=server-direct&serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-1'
    );
    const log = logQuery(
      'signal=logs&logRecordUid=event-7&start=1000&end=2000&timeZone=Asia%2FShanghai&intakeProfileId=server-direct&serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-1'
    );
    const service = identity('', 'checkout', 'commerce', 'prod');
    const paths = [
      buildTraceInvestigationMetricsPath(trace, traceSnapshot(service))!,
      buildLogInvestigationMetricsPath(log, logSnapshot(service))!,
      buildCrossSignalPath(trace, 'logs', { traceId: trace.traceId, spanId: trace.spanId })
    ];
    for (const path of paths) {
      const query = parseExploreQuery(new URL(path, 'https://hertzbeat.local').searchParams);
      expect(query).toMatchObject({
        timeZone: 'Asia/Shanghai',
        intakeProfileId: 'server-direct',
        instance: 'checkout-1',
        start: 1000,
        end: 2000
      });
      expect(exploreHandoffState(query)).toBe('scoped');
      expect(exploreUsesExactWindow(query)).toBe(true);
      expect(buildSignalApiPath(query)).toContain('start=1000&end=2000');
    }
  });

  it.each([
    'signal=metrics&entityId=7',
    'signal=logs&monitorId=8',
    'signal=metrics&intakeProfileId=server-direct&serviceName=checkout&start=1000&end=2000&timeZone=UTC',
    'signal=logs&collectorId=east&environment=prod'
  ])('still refuses genuinely incomplete handoff scope: %s', scope => {
    const query = parseExploreQuery(new URLSearchParams(scope));
    expect(exploreHandoffState(query)).toBe('invalid');
    expect(() => buildSignalApiPath(query)).toThrow();
  });

  it('preserves applicable intake and instance scope when selected identity is unchanged', () => {
    const query = traceQuery(
      'signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC&entityId=7&serviceName=checkout&serviceNamespace=commerce&environment=prod&intakeProfileId=direct&collectorId=east&instance=checkout-1&endpoint=%2Fcheckout'
    );
    const path = new URL(
      buildTraceInvestigationMetricsPath(query, traceSnapshot(identity('7', 'checkout', 'commerce', 'prod')))!,
      'https://hertzbeat.local'
    );
    expect(Object.fromEntries(path.searchParams)).toMatchObject({
      intakeProfileId: 'direct',
      collectorId: 'east',
      instance: 'checkout-1',
      endpoint: '/checkout',
      start: '1000',
      end: '2000'
    });
  });

  it.each([
    ['', '7'],
    ['7', '']
  ] as const)(
    'preserves same-service scope across entity enrichment or absent span identity (%s → %s)',
    (sourceId, selectedId) => {
      const query = traceQuery(
        'signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC&serviceName=checkout&serviceNamespace=commerce&environment=prod&intakeProfileId=direct&instance=checkout-1&endpoint=%2Fcheckout' +
          (sourceId ? '&entityId=' + sourceId : '')
      );
      const path = new URL(
        buildTraceInvestigationMetricsPath(query, traceSnapshot(identity(selectedId, 'checkout', 'commerce', 'prod')))!,
        'https://hertzbeat.local'
      );
      expect(Object.fromEntries(path.searchParams)).toMatchObject({
        entityId: '7',
        intakeProfileId: 'direct',
        instance: 'checkout-1',
        endpoint: '/checkout'
      });
    }
  );

  it('clears dependent instance and intake scope when selected identity switches', () => {
    const query = traceQuery(
      'signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC&entityId=7&serviceName=checkout&serviceNamespace=commerce&environment=prod&intakeProfileId=direct&collectorId=east&instance=checkout-1&endpoint=%2Fcheckout'
    );
    const path = new URL(
      buildTraceInvestigationMetricsPath(query, traceSnapshot(identity('8', 'payments', 'commerce', 'prod')))!,
      'https://hertzbeat.local'
    );
    expect(Object.fromEntries(path.searchParams)).toMatchObject({
      entityId: '8',
      serviceName: 'payments',
      serviceNamespace: 'commerce',
      environment: 'prod',
      start: '1000',
      end: '2000'
    });
    for (const key of ['intakeProfileId', 'collectorId', 'instance', 'endpoint'])
      expect(path.searchParams.has(key)).toBe(false);
  });

  it('uses actual selected-child service identity when RED is unavailable and suppresses unnamed handoffs', () => {
    const query = traceQuery('signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC');
    const detail = traceDetail(identity('7', 'root-service', null, 'prod'));
    const child = {
      ...detail,
      ...identity('8', 'child-service', null, 'prod'),
      spanId: '1111111111111111',
      parentSpanId: detail.rootSpanId,
      spanName: 'child',
      startTimeUnixNano: '1000000000',
      highlighted: false,
      statusMessage: null,
      spanKind: null,
      traceState: null,
      scopeName: null,
      scopeVersion: null,
      spanAttributes: {},
      events: [],
      links: [],
      codeNavigationHint: null
    };
    const snapshot: TraceInvestigationSnapshot = {
      ...traceSnapshot(null),
      selectedSpanId: child.spanId,
      gantt: { state: 'ready', reason: 'observed', source: 'greptime_traces', detail: { ...detail, spans: [child] } }
    };
    const path = new URL(buildTraceInvestigationMetricsPath(query, snapshot)!, 'https://hertzbeat.local');
    expect(Object.fromEntries(path.searchParams)).toMatchObject({
      serviceName: 'child-service',
      entityId: '8',
      start: '1000',
      end: '2000'
    });
    snapshot.gantt.detail!.spans[0]!.serviceName = null;
    expect(buildTraceInvestigationMetricsPath(query, snapshot)).toBeUndefined();
    expect(buildTraceInvestigationTopologyPath(snapshot)).toBeUndefined();
  });

  it('replaces stale URL scope with authoritative Trace RED identity and preserves the exact window', () => {
    const query = traceQuery(
      'signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC&entityId=999&serviceName=stale'
    );
    const snapshot = traceSnapshot(identity('7', 'checkout', 'commerce', 'prod'));

    const metrics = new URL(buildTraceInvestigationMetricsPath(query, snapshot)!, 'https://hertzbeat.local');
    expect(Object.fromEntries(metrics.searchParams)).toMatchObject({
      signal: 'metrics',
      start: '1000',
      end: '2000',
      timeZone: 'UTC',
      entityId: '7',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod'
    });
    expect(metrics.searchParams.has('traceId')).toBe(false);
  });

  it('uses the selected Log identity instead of stale URL context', () => {
    const query = logQuery(
      'signal=logs&logRecordUid=event-1&start=1000&end=2000&timeZone=UTC&entityId=999&serviceName=stale'
    );
    const snapshot = logSnapshot(identity('8', 'payments', null, 'stage'));

    const metrics = new URL(buildLogInvestigationMetricsPath(query, snapshot)!, 'https://hertzbeat.local');
    expect(Object.fromEntries(metrics.searchParams)).toMatchObject({
      signal: 'metrics',
      entityId: '8',
      serviceName: 'payments',
      environment: 'stage',
      start: '1000',
      end: '2000',
      timeZone: 'UTC'
    });
    expect(metrics.searchParams.has('serviceNamespace')).toBe(false);
  });

  it('suppresses unscopeable handoffs and binds topology to a safe authoritative entity', () => {
    const query = traceQuery('signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC');
    expect(buildTraceInvestigationMetricsPath(query, traceSnapshot(null))).toBeUndefined();
    expect(
      buildTraceInvestigationTopologyPath(traceSnapshot(identity('unsafe-id', 'checkout', null, null)))
    ).toBeUndefined();

    const topology = new URL(
      buildTraceInvestigationTopologyPath(traceSnapshot(identity('7', 'checkout', null, 'prod')))!,
      'https://hertzbeat.local'
    );
    expect(parseTopologyQuery(topology.searchParams)).toMatchObject({
      focusEntityId: 7,
      environment: 'prod',
      sourceKind: 'otel',
      depth: 1,
      window: { from: 1_000, to: 2_000 }
    });
  });

  it('opens Trace Topology from safe identity even when exact-trace dependencies are empty', () => {
    const snapshot = {
      ...traceSnapshot(identity('7', 'checkout', null, 'prod')),
      dependencies: {
        state: 'empty',
        reason: 'no_data',
        source: 'greptime_traces',
        truncated: false,
        edges: []
      }
    } as TraceInvestigationSnapshot;

    const topology = new URL(buildTraceInvestigationTopologyPath(snapshot)!, 'https://hertzbeat.local');
    expect(parseTopologyQuery(topology.searchParams)).toMatchObject({
      focusEntityId: 7,
      environment: 'prod',
      window: { from: 1_000, to: 2_000 }
    });
  });

  it('binds Log Topology only to selected-log identity and never to a correlated Trace fallback', () => {
    const selectedIdentity = identity('8', 'payments', null, 'stage');
    const topology = new URL(
      buildLogInvestigationTopologyPath(logSnapshot(selectedIdentity))!,
      'https://hertzbeat.local'
    );
    expect(parseTopologyQuery(topology.searchParams)).toMatchObject({
      focusEntityId: 8,
      environment: 'stage',
      sourceKind: 'otel',
      window: { from: 1_000, to: 2_000 }
    });

    const fallbackOnly = {
      ...logSnapshot(null),
      trace: {
        state: 'ready',
        reason: 'observed',
        source: 'greptime_traces',
        detail: traceDetail(identity('9', 'trace-only', null, 'prod'))
      }
    } as LogInvestigationSnapshot;
    expect(buildLogInvestigationTopologyPath(fallbackOnly)).toBeUndefined();
    expect(
      buildLogInvestigationTopologyPath(logSnapshot(identity('unsafe-id', 'payments', null, 'stage')))
    ).toBeUndefined();
  });
});

function traceQuery(search: string) {
  const query = parseExploreQuery(new URLSearchParams(search));
  if (query.signal !== 'traces') throw new Error('Trace query expected');
  return query;
}

function logQuery(search: string) {
  const query = parseExploreQuery(new URLSearchParams(search));
  if (query.signal !== 'logs') throw new Error('Log query expected');
  return query;
}

function identity(entityId: string, serviceName: string, serviceNamespace: string | null, environment: string | null) {
  return {
    workspaceId: 'default',
    entityId,
    entityType: 'service',
    serviceName,
    serviceNamespace,
    deploymentEnvironment: environment
  };
}

function traceSnapshot(redIdentity: ReturnType<typeof identity> | null) {
  return {
    window: { start: 1_000, end: 2_000 },
    red: { state: redIdentity ? 'ready' : 'unavailable', identity: redIdentity },
    gantt: { state: 'empty', detail: null }
  } as TraceInvestigationSnapshot;
}

function logSnapshot(selectedIdentity: ReturnType<typeof identity> | null) {
  return {
    window: { start: 1_000, end: 2_000 },
    selectedLog: {
      state: selectedIdentity ? 'ready' : 'empty',
      log: selectedIdentity ? { identity: selectedIdentity } : null
    },
    trace: { state: 'empty', detail: null }
  } as LogInvestigationSnapshot;
}

function traceDetail(serviceIdentity: ReturnType<typeof identity>) {
  return {
    rootState: 'unique' as const,
    rootSpanCount: 1,
    missingParentCount: 0,
    observedStartTime: 1_000,
    observedEndTime: 1_000 + 1,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: 'POST /checkout',
      serviceName: serviceIdentity.serviceName,
      serviceNamespace: serviceIdentity.serviceNamespace,
      startTime: 1_000,
      durationNanos: 1_000_000
    },
    rootSpanId: '0123456789abcdef',
    serviceName: serviceIdentity.serviceName,
    serviceNamespace: serviceIdentity.serviceNamespace,
    deploymentEnvironment: serviceIdentity.deploymentEnvironment,
    entityId: serviceIdentity.entityId,
    entityType: serviceIdentity.entityType,
    rootSpanName: 'POST /checkout',
    durationNanos: '1000000',
    status: 'OK',
    startTime: 1_000,
    errorSpanCount: 0,
    resourceAttributes: {},
    spans: []
  };
}
