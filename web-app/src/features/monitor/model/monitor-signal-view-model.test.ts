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

import type { MonitorMetricCatalogEvidence } from './monitor-detail-model';
import type { MonitorInvestigationViewState } from './monitor-investigation-model';
import { resolveMonitorSignalCapabilities } from './monitor-signal-view-model';

describe('Monitor Signal View model', () => {
  it('keeps native Metrics independent from OTLP evidence', () => {
    const capabilities = resolveMonitorSignalCapabilities(nativeCatalog('ready'), readyInvestigation('empty'));

    expect(capabilities).toEqual({
      nativeMetrics: 'ready',
      currentAlerts: 'empty',
      collection: 'empty',
      boundEntity: 'empty',
      otlpEvidence: 'unavailable'
    });
  });

  it('uses only observed binding signals to classify OTLP evidence', () => {
    const state = readyInvestigation('ready');
    if (state.kind !== 'ready' || state.snapshot.binding.state !== 'ready') throw new Error('fixture');
    state.snapshot.binding.identity.signals = ['logs', 'traces'];

    expect(resolveMonitorSignalCapabilities(nativeCatalog('empty'), state)).toMatchObject({
      nativeMetrics: 'empty',
      boundEntity: 'ready',
      otlpEvidence: 'ready'
    });

    state.snapshot.binding.identity.signals = [];
    expect(resolveMonitorSignalCapabilities(nativeCatalog('empty'), state).otlpEvidence).toBe('empty');
  });

  it('does not turn unresolved investigation evidence into empty or healthy states', () => {
    expect(
      resolveMonitorSignalCapabilities(nativeCatalog('loading'), {
        kind: 'loading',
        window: { from: 1_000, to: 2_000, timeZone: 'UTC' }
      })
    ).toEqual({
      nativeMetrics: 'unknown',
      currentAlerts: 'unknown',
      collection: 'unknown',
      boundEntity: 'unknown',
      otlpEvidence: 'unknown'
    });
  });
});

function nativeCatalog(kind: MonitorMetricCatalogEvidence['kind']): MonitorMetricCatalogEvidence {
  if (kind === 'fallback') return { kind, options: [], references: [] };
  return { kind, options: [] };
}

function readyInvestigation(bindingState: 'ready' | 'empty'): MonitorInvestigationViewState {
  const window = { from: 1_000, to: 2_000, timeZone: 'UTC' };
  return {
    kind: 'ready',
    window,
    snapshot: {
      monitorId: 7,
      window: { start: window.from, end: window.to },
      collection: { state: 'empty', source: 'greptime_collection_events', event: null },
      alerts: { state: 'empty', source: 'current_alerts', scope: 'current', activeCount: 0, previews: [] },
      binding:
        bindingState === 'ready'
          ? {
              state: 'ready',
              identity: {
                monitorId: 7,
                entityId: 17,
                entityType: 'service',
                serviceName: 'checkout',
                serviceNamespace: null,
                environment: null,
                signals: ['logs']
              }
            }
          : { state: 'empty', identity: null }
    }
  };
}
