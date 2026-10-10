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

import type { HertzBeatLogQueryOutcome } from '@/platform/perses';

import type { EntityDetail } from './entity-contract';
import { resolveEntitySignalEvidence } from './entity-signal-evidence-model';
import {
  buildEntitySignalHandoffPath,
  createEntitySignalPlan,
  resolveSignalCapabilities
} from './entity-signal-view-model';
import { redMetricOutcomes } from './entity-red-metric-model';

const window = { from: 1_750_000_000_000, to: 1_750_000_060_000 } as const;
const detail: EntityDetail = {
  entity: { id: 7, type: 'service', name: 'checkout', environment: 'prod' },
  identities: [{ identityType: 'otel', identityKey: 'service.name', identityValue: 'checkout' }],
  evidence: { activeAlertCount: 2 },
  monitorPreview: {
    items: [{ id: 42, name: 'checkout-http', app: 'website', instance: 'checkout-01' }],
    total: 1,
    complete: true
  },
  opsSummary: {
    ownerReady: true,
    runbookReady: true,
    relationReady: true,
    telemetryReady: true,
    statusReady: true,
    readinessScore: 100,
    relationCount: 1
  },
  relations: [{ entityId: 12, entityName: 'payments', relationType: 'calls' }]
};

describe('entity signal view model', () => {
  it('creates one exact entity anchor and bounded signal queries without duplicating inferred identity', () => {
    const plan = createEntitySignalPlan(detail, window, 'Asia/Shanghai');

    expect(plan.anchor).toEqual({
      source: 'entity',
      context: { entityId: '7' },
      window: { ...window, timeZone: 'Asia/Shanghai' }
    });
    expect(plan.logsQuery).toEqual({
      signal: 'logs',
      queryKind: 'table',
      timeWindow: window,
      context: { entityId: '7', entityType: 'service' },
      hideInternal: true,
      hideNoise: true,
      limit: 25
    });
    expect(plan.tracesQuery).toMatchObject({
      signal: 'traces',
      queryKind: 'table',
      timeWindow: window,
      context: { entityId: '7', entityType: 'service' },
      spanScope: 'entrypoint',
      hideInternal: true,
      limit: 25
    });
  });

  it('plans independent signal queries from a trustworthy base entity when composite detail is unavailable', () => {
    const plan = createEntitySignalPlan(detail.entity, window, 'UTC');

    expect(plan.anchor.context).toEqual({ entityId: '7' });
    expect(plan.logsQuery.context).toEqual({ entityId: '7', entityType: 'service' });
    expect(plan.tracesQuery.context).toEqual({ entityId: '7', entityType: 'service' });
  });

  it('uses a Gantt query only when an exact trace identity is present', () => {
    const plan = createEntitySignalPlan(
      detail,
      window,
      'UTC',
      ' 0123456789abcdef0123456789abcdef ',
      ' fedcba9876543210 '
    );

    expect(plan.anchor).toMatchObject({ traceId: '0123456789abcdef0123456789abcdef', spanId: 'fedcba9876543210' });
    expect(plan.logsQuery).toMatchObject({ traceId: '0123456789abcdef0123456789abcdef', spanId: 'fedcba9876543210' });
    expect(plan.tracesQuery).toMatchObject({
      queryKind: 'gantt',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: 'fedcba9876543210'
    });
    expect(buildEntitySignalHandoffPath(plan, 'traces')).toBe(
      '/explore?signal=traces&entityId=7&start=1750000000000&end=1750000060000&timeZone=UTC&traceId=0123456789abcdef0123456789abcdef&spanId=fedcba9876543210'
    );
    expect(buildEntitySignalHandoffPath(plan, 'logs')).toBe(
      '/explore?signal=logs&entityId=7&start=1750000000000&end=1750000060000&timeZone=UTC&traceId=0123456789abcdef0123456789abcdef&spanId=fedcba9876543210'
    );
  });

  it('rejects invalid or overlong windows instead of silently querying a different interval', () => {
    expect(() => createEntitySignalPlan(detail, { from: 0, to: 1 }, 'UTC')).toThrow();
    expect(() =>
      createEntitySignalPlan(detail, { from: window.from, to: window.from + 24 * 60 * 60 * 1_000 + 1 }, 'UTC')
    ).toThrow();
    expect(() => createEntitySignalPlan(detail, window, 'not/a-zone')).toThrow();
  });

  it('derives capabilities from exact query outcomes and never treats monitor binding as OTLP metric evidence', () => {
    const capabilities = resolveSignalCapabilities(detail, {
      red: { state: 'empty' },
      logs: { state: 'ready', data: { rows: [{}], total: 1 }, truncated: false } as HertzBeatLogQueryOutcome,
      traces: { state: 'error', error: unavailableFailure() }
    });

    expect(capabilities).toMatchObject({
      metrics: 'unknown',
      redMetrics: 'empty',
      nativeMetrics: 'unknown',
      otelMetrics: 'unknown',
      logs: 'available',
      traces: 'unavailable',
      topology: 'available',
      collection: 'unknown',
      alerts: 'unknown'
    });
  });

  it('uses the authoritative relation count even when the capped relation preview is empty', () => {
    const withoutPreview = { ...detail, relations: [] };
    const capabilities = resolveSignalCapabilities(withoutPreview, {});

    expect(capabilities.topology).toBe('available');
    expect(
      resolveEntitySignalEvidence(createEntitySignalPlan(withoutPreview, window, 'UTC'), withoutPreview, capabilities)
    ).not.toEqual(expect.arrayContaining([expect.objectContaining({ key: 'topology' })]));
  });

  it('keeps legacy monitor, topology, and alert context unknown without composite detail', () => {
    const capabilities = resolveSignalCapabilities(undefined, {
      red: { state: 'ready' },
      logs: { state: 'empty', truncated: false },
      traces: { state: 'empty', truncated: false }
    });

    expect(capabilities).toMatchObject({
      metrics: 'available',
      redMetrics: 'available',
      topology: 'unknown',
      collection: 'unknown',
      alerts: 'unknown',
      semanticGraph: 'unknown'
    });
  });

  it('uses M4 correlation to expose reason and confidence for available evidence', () => {
    const plan = createEntitySignalPlan(detail, window, 'UTC');
    const evidence = resolveEntitySignalEvidence(
      plan,
      detail,
      resolveSignalCapabilities(detail, {
        red: { state: 'ready' },
        logs: { state: 'empty', truncated: false },
        traces: { state: 'empty', truncated: false }
      })
    );

    expect(evidence.map(item => [item.key, item.reason.kind, item.confidence])).toEqual([
      ['metrics', 'same-entity', 'high'],
      ['collection', 'bound-monitor', 'high'],
      ['topology', 'topology-related', 'medium']
    ]);
  });

  it('correlates each signal against its actual trace scope without upgrading entity-wide RED evidence', () => {
    const plan = createEntitySignalPlan(detail, window, 'UTC', '0123456789abcdef0123456789abcdef', 'fedcba9876543210');
    const evidence = resolveEntitySignalEvidence(
      plan,
      detail,
      resolveSignalCapabilities(detail, {
        red: { state: 'ready' },
        logs: { state: 'ready', data: { rows: [{}], total: 1 }, truncated: false } as HertzBeatLogQueryOutcome,
        traces: {
          state: 'ready',
          data: {
            rootState: 'unique',
            rootSpanCount: 1,
            missingParentCount: 0,
            representativeSpan: {
              spanId: '0123456789abcdef',
              spanName: 'POST /checkout',
              serviceName: 'checkout',
              serviceNamespace: null,
              startTime: 1,
              durationNanos: Number('0')
            },
            observedStartTime: 1,
            observedEndTime: 1 + Math.ceil(Number('0') / 1_000_000),
            traceId: '0123456789abcdef0123456789abcdef',
            rootSpanId: '0123456789abcdef',
            serviceName: 'checkout',
            serviceNamespace: null,
            rootSpanName: 'POST /checkout',
            durationNanos: '0',
            status: 'OK',
            startTime: 1,
            errorSpanCount: 0,
            resourceAttributes: {},
            spans: [
              {
                startTimeUnixNano: (BigInt(1) * 1_000_000n).toString(),
                traceId: '0123456789abcdef0123456789abcdef',
                spanId: '0123456789abcdef',
                parentSpanId: null,
                spanName: 'POST /checkout',
                serviceName: 'checkout',
                status: 'OK',
                statusMessage: null,
                spanKind: 'SERVER',
                traceState: null,
                scopeName: null,
                scopeVersion: null,
                durationNanos: '0',
                startTime: 1,
                highlighted: false,
                resourceAttributes: {},
                spanAttributes: {},
                events: [],
                links: [],
                codeNavigationHint: null
              }
            ]
          },
          truncated: false
        }
      })
    ).filter(item => item.key === 'metrics' || item.key === 'logs' || item.key === 'traces');

    expect(evidence.map(item => [item.key, item.reason.kind, item.confidence])).toEqual([
      ['logs', 'exact-span', 'exact'],
      ['traces', 'exact-span', 'exact'],
      ['metrics', 'same-entity', 'high']
    ]);
  });

  it('reports the authoritative topology total rather than the capped relation preview length', () => {
    const withCappedPreview = {
      ...detail,
      opsSummary: { ...detail.opsSummary!, relationCount: 7 }
    };
    const evidence = resolveEntitySignalEvidence(
      createEntitySignalPlan(withCappedPreview, window, 'UTC'),
      withCappedPreview,
      resolveSignalCapabilities(withCappedPreview, {})
    );

    expect(evidence.find(item => item.key === 'topology')?.summary).toEqual({ state: 'available', count: 7 });
  });

  it('maps ready RED points into independent Perses metric outcomes with Flow provenance', () => {
    const outcomes = redMetricOutcomes({
      state: 'ready',
      source: 'greptime_flow',
      resolutionSeconds: 60,
      window: { start: window.from, end: window.to },
      identity: {
        workspaceId: 'default',
        entityId: '7',
        entityType: 'service',
        serviceName: 'checkout',
        serviceNamespace: null,
        deploymentEnvironment: 'prod'
      },
      summary: {
        requestCount: 3,
        errorCount: 1,
        requestRatePerSecond: 0.05,
        errorRate: 1 / 3,
        latencyAverageMs: 12,
        latencyP95Ms: 20
      },
      series: [
        {
          timestamp: window.from,
          requestCount: 3,
          errorCount: 1,
          requestRatePerSecond: 0.05,
          errorRate: 1 / 3,
          latencyAverageMs: 12,
          latencyP95Ms: 20
        }
      ]
    });

    expect(outcomes.requestRate).toMatchObject({
      state: 'ready',
      data: { source: 'greptime_flow', series: [{ points: [{ value: 0.05 }] }] }
    });
    expect(outcomes.errorRate).toMatchObject({ state: 'ready', data: { series: [{ points: [{ value: 1 / 3 }] }] } });
    expect(outcomes.latencyP95).toMatchObject({ state: 'ready', data: { series: [{ points: [{ value: 20 }] }] } });
  });
});

function unavailableFailure() {
  return { kind: 'unavailable', messageKey: 'perses.query.unavailable', retryable: true } as const;
}
