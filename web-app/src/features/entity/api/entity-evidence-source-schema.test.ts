/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { EntityContractError } from '../model/entity-contract';
import { parseEntityDetail } from './entity-schema';

describe('entity evidence source schema', () => {
  it('maps canonical monitor and OTLP provenance without merging their counts', () => {
    expect(parseEntityDetail(detailWire()).unifiedEvidence).toEqual({
      activeSignalCount: 3,
      activeSignals: ['metrics', 'logs', 'traces'],
      active: { metrics: true, logs: true, traces: true },
      totals: { metrics: 8, logs: 4, traces: 2 },
      lastObservedAt: 2_000,
      sources: [
        { source: 'monitor', metrics: 6, logs: 0, traces: 0, lastObservedAt: 1_000 },
        { source: 'otlp', metrics: 2, logs: 4, traces: 2, lastObservedAt: 2_000 }
      ]
    });
  });

  it.each([
    { caseName: 'missing sources', mutate: (summary: Record<string, unknown>) => delete summary.evidenceSources },
    {
      caseName: 'missing source count',
      mutate: (summary: Record<string, unknown>) =>
        delete (summary.evidenceSources as Record<string, unknown>[])[0]!.metricEvidenceCount
    },
    {
      caseName: 'unknown source',
      mutate: (summary: Record<string, unknown>) =>
        ((summary.evidenceSources as Record<string, unknown>[])[0]!.source = 'synthetic')
    },
    {
      caseName: 'duplicate source',
      mutate: (summary: Record<string, unknown>) =>
        ((summary.evidenceSources as Record<string, unknown>[])[1]!.source = 'monitor')
    }
  ])('rejects $caseName instead of inventing provenance', ({ mutate }) => {
    const wire = detailWire();
    mutate(wire.unifiedEvidenceSummary);
    expect(() => parseEntityDetail(wire)).toThrow(EntityContractError);
  });
});

function detailWire() {
  return {
    entity: { entity: { id: 7, type: 'service', name: 'checkout' }, identities: [] },
    unifiedEvidenceSummary: {
      activeSignalCount: 3,
      metricsActive: true,
      logsActive: true,
      tracesActive: true,
      metricEvidenceCount: 8,
      logEvidenceCount: 4,
      traceEvidenceCount: 2,
      latestObservedAt: 2_000,
      activeSignals: ['metrics', 'logs', 'traces'],
      evidenceSources: [
        {
          source: 'monitor',
          metricEvidenceCount: 6,
          logEvidenceCount: 0,
          traceEvidenceCount: 0,
          latestObservedAt: 1_000
        },
        {
          source: 'otlp',
          metricEvidenceCount: 2,
          logEvidenceCount: 4,
          traceEvidenceCount: 2,
          latestObservedAt: 2_000
        }
      ]
    },
    boundMonitors: [],
    topologyNeighbors: []
  };
}
