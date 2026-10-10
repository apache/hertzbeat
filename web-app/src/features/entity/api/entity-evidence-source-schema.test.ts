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

  it('accepts the current backend summary without a source breakdown', () => {
    const wire = detailWire();
    delete (wire.unifiedEvidenceSummary as Partial<typeof wire.unifiedEvidenceSummary>).evidenceSources;

    expect(parseEntityDetail(wire).unifiedEvidence).toEqual({
      activeSignalCount: 3,
      activeSignals: ['metrics', 'logs', 'traces'],
      active: { metrics: true, logs: true, traces: true },
      totals: { metrics: 8, logs: 4, traces: 2 },
      lastObservedAt: 2_000,
      sources: []
    });
  });

  it.each([
    {
      caseName: 'null source breakdown',
      mutate: (summary: Record<string, unknown>) => (summary.evidenceSources = null)
    },
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
