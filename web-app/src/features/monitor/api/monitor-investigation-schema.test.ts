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

import { MonitorContractError } from '../model/monitor-contract';
import { parseMonitorInvestigation } from './monitor-investigation-schema';

const requested = { monitorId: 42, window: { from: 1_750_000_000_000, to: 1_750_003_600_000 } };

describe('monitor investigation schema', () => {
  it('accepts a strict ready contract without losing failure provenance', () => {
    expect(parseMonitorInvestigation(readyInvestigation(), requested.monitorId, requested.window)).toEqual(
      readyInvestigation()
    );
  });

  it('accepts explicit empty and unavailable branches without inventing zeros', () => {
    const value = {
      ...readyInvestigation(),
      collection: { state: 'empty', source: 'greptime_collection_events', event: null },
      alerts: { state: 'unavailable', source: 'current_alerts', scope: 'current', activeCount: null, previews: [] },
      binding: { state: 'empty', identity: null }
    };

    expect(parseMonitorInvestigation(value, requested.monitorId, requested.window)).toEqual(value);
  });

  it.each([
    { monitorId: 41 },
    { window: { start: requested.window.from + 1, end: requested.window.to } },
    { collection: { state: 'ready', source: 'greptime_collection_events', event: null } },
    {
      collection: { state: 'empty', source: 'greptime_collection_events', event: readyInvestigation().collection.event }
    },
    { alerts: { state: 'ready', source: 'current_alerts', scope: 'current', activeCount: 0, previews: [] } },
    { alerts: { state: 'empty', source: 'current_alerts', scope: 'current', activeCount: null, previews: [] } },
    { alerts: { state: 'unavailable', source: 'current_alerts', scope: 'current', activeCount: 0, previews: [] } },
    { binding: { state: 'ready', identity: null } },
    { binding: { state: 'empty', identity: readyInvestigation().binding.identity } },
    { binding: { ...readyInvestigation().binding, extra: true } },
    {
      binding: {
        state: 'ready',
        identity: { ...readyInvestigation().binding.identity, signals: ['metrics', 'metrics'] }
      }
    }
  ])('rejects mismatched, contradictory, duplicate, or non-strict evidence %#', override => {
    const value = { ...readyInvestigation(), ...override };
    expect(() => parseMonitorInvestigation(value, requested.monitorId, requested.window)).toThrow(MonitorContractError);
  });

  it.each([
    ['collectorId', 'c'.repeat(129)],
    ['target', 't'.repeat(513)],
    ['metricSet', 'm'.repeat(193)]
  ] as const)('rejects an overlong collection %s', (field, value) => {
    const investigation = readyInvestigation();
    investigation.collection.event = { ...investigation.collection.event, [field]: value };
    expect(() => parseMonitorInvestigation(investigation, requested.monitorId, requested.window)).toThrow(
      MonitorContractError
    );
  });

  it.each([
    ['status', 's'.repeat(65)],
    ['severity', 's'.repeat(65)],
    ['summary', 's'.repeat(513)],
    ['activeAt', 8_640_000_000_000_001]
  ] as const)('rejects an invalid alert preview %s', (field, value) => {
    const investigation = readyInvestigation();
    investigation.alerts.previews[0] = { ...investigation.alerts.previews[0]!, [field]: value };
    expect(() => parseMonitorInvestigation(investigation, requested.monitorId, requested.window)).toThrow(
      MonitorContractError
    );
  });

  it('rejects a non-firing preview inside ready current-alert evidence', () => {
    const investigation = readyInvestigation();
    investigation.alerts.previews[0] = { ...investigation.alerts.previews[0]!, status: 'resolved' };
    expect(() => parseMonitorInvestigation(investigation, requested.monitorId, requested.window)).toThrow(
      MonitorContractError
    );
  });

  it.each([
    { durationMillis: -2 },
    { outcome: 'UNKNOWN' },
    { failureClass: 'DNS' },
    { phase: 'HANDSHAKE' },
    { fieldCount: -1 },
    { rowCount: 1.5 },
    { observedAt: requested.window.to }
  ])('rejects invalid collection event evidence %#', patch => {
    const value = readyInvestigation();
    value.collection.event = { ...value.collection.event, ...patch } as typeof value.collection.event;
    expect(() => parseMonitorInvestigation(value, requested.monitorId, requested.window)).toThrow(MonitorContractError);
  });
});

function readyInvestigation() {
  return {
    monitorId: 42,
    window: { start: requested.window.from, end: requested.window.to },
    collection: {
      state: 'ready' as const,
      source: 'greptime_collection_events' as const,
      event: {
        observedAt: requested.window.to - 1,
        durationMillis: -1,
        outcome: 'FAILURE' as const,
        collectorId: '',
        target: '',
        metricSet: '',
        failureClass: 'UNREACHABLE' as const,
        phase: 'CONNECT' as const,
        fieldCount: 0,
        rowCount: 0
      }
    },
    alerts: {
      state: 'ready' as const,
      source: 'current_alerts' as const,
      scope: 'current' as const,
      activeCount: 2,
      previews: [
        { id: 9, status: 'firing', severity: null, summary: null, activeAt: null },
        { id: 10, status: 'firing', severity: 'warning', summary: 'Slow response', activeAt: 1_749_999_000_000 }
      ]
    },
    binding: {
      state: 'ready' as const,
      identity: {
        monitorId: 42,
        entityId: 7,
        entityType: 'service' as const,
        serviceName: 'checkout',
        serviceNamespace: null,
        environment: null,
        signals: ['metrics', 'logs', 'traces'] as const
      }
    }
  };
}
