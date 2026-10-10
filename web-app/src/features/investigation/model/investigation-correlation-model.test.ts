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

import {
  correlateInvestigationEvidence,
  type CorrelationReason,
  type InvestigationCorrelationCandidate,
  type InvestigationEvidenceSummary
} from './investigation-correlation-model';
import {
  createInvestigationAnchor,
  createSignalCapabilities,
  type InvestigationAnchor,
  type InvestigationSource,
  type SignalCapabilities
} from './investigation-anchor-model';

const window = { from: 1_750_000_000_000, to: 1_750_000_060_000, timeZone: 'UTC' } as const;
const sources: InvestigationSource[] = ['entity', 'monitor', 'alert', 'metric', 'log', 'trace', 'topology', 'ai'];

describe('investigation correlation model', () => {
  it.each(sources)('accepts the supported %s anchor source without duplicating shared context fields', source => {
    const anchor = createInvestigationAnchor({
      source,
      context: {
        entityId: ' 7 ',
        monitorId: ' 42 ',
        serviceName: ' checkout ',
        serviceNamespace: ' commerce ',
        environment: ' production '
      },
      window: { ...window, timeZone: ' UTC ' },
      traceId: ' trace-1 ',
      spanId: ' span-1 ',
      alertId: ' 91 '
    });

    expect(anchor).toEqual({
      source,
      context: {
        entityId: '7',
        monitorId: '42',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'production'
      },
      window,
      traceId: 'trace-1',
      spanId: 'span-1',
      alertId: '91'
    });
    expect(anchor).not.toHaveProperty('entityId');
    expect(anchor).not.toHaveProperty('monitorId');
    expect(anchor).not.toHaveProperty('serviceName');
  });

  it.each([
    { source: 'unsupported', context: {}, window },
    { source: 'entity', context: {}, window: { ...window, from: 0 } },
    { source: 'entity', context: {}, window: { ...window, to: window.from } },
    { source: 'entity', context: {}, window: { ...window, timeZone: 'not/a-zone' } },
    { source: 'entity', context: { entityId: '01' }, window },
    { source: 'monitor', context: { monitorId: '9223372036854775808' }, window },
    { source: 'trace', context: {}, window, traceId: ' ' },
    { source: 'trace', context: {}, window, spanId: 'span-without-trace' },
    { source: 'alert', context: {}, window, alertId: '0' },
    { source: 'entity', context: { authorization: 'private' }, window }
  ])('fails closed on invalid anchor evidence %#', candidate => {
    expect(() => createInvestigationAnchor(candidate as InvestigationAnchor)).toThrow();
  });

  it('keeps every capability independently honest and defaults only missing evidence to unknown', () => {
    const capabilities: SignalCapabilities = createSignalCapabilities({
      metrics: 'available',
      logs: 'empty',
      traces: 'unavailable',
      topology: 'unknown',
      nativeMetrics: 'available',
      traceCorrelation: 'empty'
    });

    expect(capabilities).toEqual({
      metrics: 'available',
      logs: 'empty',
      traces: 'unavailable',
      topology: 'unknown',
      collection: 'unknown',
      alerts: 'unknown',
      nativeMetrics: 'available',
      otelMetrics: 'unknown',
      redMetrics: 'unknown',
      traceCorrelation: 'empty',
      logTraceCorrelation: 'unknown',
      semanticGraph: 'unknown'
    });
    expect(() => createSignalCapabilities({ logs: 'ready' } as never)).toThrow();
    expect(() => createSignalCapabilities({ metrics: 'available', telemetry: 'available' } as never)).toThrow();
  });

  it('orders correlations by authoritative reason and derives confidence without caller input', () => {
    const anchor = investigationAnchor();
    const candidates = [
      candidate('time', anchorFor({ entityId: '13', serviceName: 'inventory' })),
      candidate('topology', anchorFor({ entityId: '12', serviceName: 'inventory' }), {
        sourceEntityId: '7',
        targetEntityId: '12'
      }),
      candidate('otel', anchorFor({ entityId: '11', monitorId: '50' })),
      candidate('monitor', anchorFor({ entityId: '10', monitorId: '42', serviceName: 'inventory' })),
      candidate('entity', anchorFor({ entityId: '7', monitorId: '50', serviceName: 'inventory' })),
      candidate('trace', anchorFor({ traceId: 'trace-1', spanId: 'span-2', entityId: '20' })),
      candidate('span', anchorFor({ traceId: 'trace-1', spanId: 'span-1', entityId: '21' }))
    ];

    const evidence: InvestigationEvidenceSummary[] = correlateInvestigationEvidence(anchor, candidates);
    const reasons: CorrelationReason[] = evidence.map(item => item.reason);

    expect(evidence.map(item => item.candidateQuery.key)).toEqual([
      'span',
      'trace',
      'entity',
      'monitor',
      'otel',
      'topology',
      'time'
    ]);
    expect(reasons).toEqual([
      { kind: 'exact-span', level: 1 },
      { kind: 'exact-trace', level: 1 },
      { kind: 'same-entity', level: 2 },
      { kind: 'bound-monitor', level: 3 },
      { kind: 'canonical-otel-identity', level: 4 },
      { kind: 'topology-related', level: 5 },
      { kind: 'time-proximity', level: 6 }
    ]);
    expect(evidence.map(item => item.confidence)).toEqual([
      'exact',
      'exact',
      'high',
      'high',
      'medium',
      'medium',
      'low'
    ]);
  });

  it('uses time only as proximity evidence and never copies same-entity identity into the candidate', () => {
    const [evidence] = correlateInvestigationEvidence(investigationAnchor(), [
      candidate('nearby', anchorFor({ entityId: '99', monitorId: '100', serviceName: 'inventory' }))
    ]);

    expect(evidence?.reason).toEqual({ kind: 'time-proximity', level: 6 });
    expect(evidence?.candidateQuery.anchor.context.entityId).toBe('99');
    expect(evidence?.candidateQuery.anchor.context.entityId).not.toBe('7');
  });

  it('uses the same non-empty service instance as canonical OTel identity before the service tuple fallback', () => {
    const anchor = createInvestigationAnchor({
      ...investigationAnchor(),
      context: { ...investigationAnchor().context, instance: 'checkout-7d9' }
    });
    const target = anchorFor({
      entityId: '99',
      monitorId: '100',
      serviceName: 'inventory',
      serviceNamespace: 'warehouse',
      environment: 'staging',
      instance: 'checkout-7d9'
    });

    expect(correlateInvestigationEvidence(anchor, [candidate('instance', target)])[0]?.reason).toEqual({
      kind: 'canonical-otel-identity',
      level: 4
    });
  });

  it('deduplicates by candidate query key deterministically and keeps the strongest evidence', () => {
    const anchor = investigationAnchor();
    const nearby = candidate('same-query', anchorFor({ entityId: '99', serviceName: 'inventory' }));
    const exact = candidate('same-query', anchorFor({ traceId: 'trace-1', spanId: 'span-1', entityId: '21' }));

    const forward = correlateInvestigationEvidence(anchor, [nearby, exact]);
    const reversed = correlateInvestigationEvidence(anchor, [exact, nearby]);

    expect(forward).toEqual(reversed);
    expect(forward).toHaveLength(1);
    expect(forward[0]?.reason).toEqual({ kind: 'exact-span', level: 1 });
  });

  it('keeps evidence summary-only and rejects raw telemetry or arbitrary confidence fields', () => {
    const anchor = investigationAnchor();
    const valid = candidate('summary', anchorFor({ traceId: 'trace-1' }));
    const [evidence] = correlateInvestigationEvidence(anchor, [valid]);

    expect(evidence).toEqual({
      summary: { state: 'available', count: 2 },
      candidateQuery: { key: 'summary', anchor: valid.candidateQuery.anchor },
      reason: { kind: 'exact-trace', level: 1 },
      confidence: 'exact'
    });
    expect(Object.keys(evidence ?? {})).toEqual(['summary', 'candidateQuery', 'reason', 'confidence']);

    expect(() =>
      correlateInvestigationEvidence(anchor, [{ ...valid, rawTelemetry: { body: 'private' } } as never])
    ).toThrow();
    expect(() => correlateInvestigationEvidence(anchor, [{ ...valid, confidence: 'exact' } as never])).toThrow();
    expect(() =>
      correlateInvestigationEvidence(anchor, [{ ...valid, summary: { ...valid.summary, body: 'private' } } as never])
    ).toThrow();
  });

  it('omits candidates outside the bounded proximity window without stronger correlation evidence', () => {
    const distant = anchorFor(
      { entityId: '99', monitorId: '100', serviceName: 'inventory' },
      { from: window.to + 300_001, to: window.to + 360_000, timeZone: 'UTC' }
    );
    expect(correlateInvestigationEvidence(investigationAnchor(), [candidate('distant', distant)])).toEqual([]);
  });
});

function investigationAnchor(): InvestigationAnchor {
  return createInvestigationAnchor({
    source: 'trace',
    context: {
      entityId: '7',
      monitorId: '42',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'production'
    },
    window,
    traceId: 'trace-1',
    spanId: 'span-1'
  });
}

function anchorFor(
  patch: Partial<InvestigationAnchor['context']> & { traceId?: string; spanId?: string },
  candidateWindow: InvestigationAnchor['window'] = window
): InvestigationAnchor {
  const { traceId, spanId, ...contextPatch } = patch;
  return createInvestigationAnchor({
    source: traceId ? 'trace' : 'log',
    context: {
      entityId: '30',
      monitorId: '60',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'production',
      ...contextPatch
    },
    window: candidateWindow,
    ...(traceId ? { traceId } : {}),
    ...(spanId ? { spanId } : {})
  });
}

function candidate(
  key: string,
  anchor: InvestigationAnchor,
  topologyRelation?: InvestigationCorrelationCandidate['topologyRelation']
): InvestigationCorrelationCandidate {
  return {
    candidateQuery: { key, anchor },
    summary: { state: 'available', count: 2 },
    ...(topologyRelation ? { topologyRelation } : {})
  };
}
