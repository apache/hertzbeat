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

import { describe, expect, it, vi } from 'vitest';

import { createSignalCapabilities } from '@/features/investigation';

import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import type { EntityDetailEvidence } from '../model/entity-view-model';
import { buildEntityInspectionActions } from './entity-detail-inspection-actions';

describe('entity detail inspection actions', () => {
  it('falls back to the existing monitor-backed Metrics handoff when exact RED is not available', () => {
    const navigate = vi.fn();
    const actions = buildEntityInspectionActions(evidence(), unknownMetricSignals(), null, navigate);

    actions.explore('metrics');

    expect(navigate).toHaveBeenCalledWith('/explore?signal=metrics&timeRange=last-30m&instance=10.0.0.7');
  });

  it('opens an exact independent signal handoff from degraded identity evidence', () => {
    const navigate = vi.fn();
    const signals = unknownMetricSignals();
    signals.capabilities = createSignalCapabilities({ logs: 'available' });
    const actions = buildEntityInspectionActions(
      { kind: 'degraded', entity: { id: 7, type: 'host', name: 'checkout-host' }, unavailable: 'telemetry' },
      signals,
      null,
      navigate
    );

    actions.explore('logs');

    expect(navigate).toHaveBeenCalledWith(
      '/explore?signal=logs&entityId=7&start=1750000000000&end=1750000060000&timeZone=UTC'
    );
  });
});

function evidence(): EntityDetailEvidence {
  return {
    kind: 'ready',
    detail: {
      entity: { id: 7, type: 'host', name: 'checkout-host' },
      identities: [],
      monitorPreview: {
        items: [{ id: 3, name: 'host-ping', app: 'ping', instance: '10.0.0.7' }],
        total: 1,
        complete: true
      },
      relations: []
    }
  };
}

function unknownMetricSignals(): Extract<EntitySignalViewState, { kind: 'ready' }> {
  const window = { from: 1_750_000_000_000, to: 1_750_000_060_000 };
  return {
    kind: 'ready',
    plan: {
      anchor: { source: 'entity', context: { entityId: '7' }, window: { ...window, timeZone: 'UTC' } },
      logsQuery: { signal: 'logs', queryKind: 'table', timeWindow: window, context: { entityId: '7' } },
      tracesQuery: { signal: 'traces', queryKind: 'table', timeWindow: window, context: { entityId: '7' } }
    },
    capabilities: createSignalCapabilities({ metrics: 'unknown', redMetrics: 'empty' }),
    red: { state: 'empty' },
    evidence: [],
    boundMonitors: { state: 'known', total: 1, names: ['host-ping'] },
    topology: { names: [] },
    alerts: {}
  };
}
