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

import type { Monitor } from './monitor-contract';
import {
  buildMonitorInvestigationEntityPath,
  buildMonitorInvestigationSignalPath,
  createMonitorInvestigation,
  monitorInvestigationWindow,
  type MonitorInvestigationIdentity
} from './monitor-investigation-model';

const monitor: Monitor = {
  id: 42,
  name: 'Checkout MySQL',
  app: 'mysql',
  instance: '10.0.0.8:3306',
  status: 1
};

const binding: MonitorInvestigationIdentity = {
  monitorId: 42,
  entityId: 7,
  entityType: 'service',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  environment: 'production',
  signals: ['metrics', 'logs', 'traces'] as const
};

describe('monitor investigation handoff', () => {
  it('keeps authoritative Monitor and Entity identity with one exact timezone-bound window', () => {
    const investigation = createMonitorInvestigation(monitor, binding, {
      from: 1_723_454_400_000,
      to: 1_723_456_200_000,
      timeZone: 'Asia/Shanghai'
    });

    expect(investigation).toEqual({
      context: {
        entityId: '7',
        monitorId: '42',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'production',
        instance: '10.0.0.8:3306'
      },
      window: {
        from: 1_723_454_400_000,
        to: 1_723_456_200_000,
        timeZone: 'Asia/Shanghai'
      },
      signals: ['metrics', 'logs', 'traces']
    });
    expect(buildMonitorInvestigationSignalPath(investigation, 'logs')).toBe(
      '/explore?signal=logs&entityId=7&monitorId=42&serviceName=checkout' +
        '&serviceNamespace=commerce&environment=production&instance=10.0.0.8%3A3306' +
        '&start=1723454400000&end=1723456200000&timeZone=Asia%2FShanghai'
    );
  });

  it('does not invent a signal link that authoritative binding evidence did not advertise', () => {
    const investigation = createMonitorInvestigation(
      monitor,
      { ...binding, signals: ['metrics'] },
      { from: 1_000, to: 2_000, timeZone: 'UTC' }
    );

    expect(buildMonitorInvestigationSignalPath(investigation, 'metrics')).toContain('signal=metrics');
    expect(buildMonitorInvestigationSignalPath(investigation, 'logs')).toBeUndefined();
  });

  it('preserves the exact investigation window on a bound Entity handoff', () => {
    expect(
      buildMonitorInvestigationEntityPath(7, {
        from: 1_723_454_400_000,
        to: 1_723_456_200_000,
        timeZone: 'Asia/Shanghai'
      })
    ).toBe('/entities/7?start=1723454400000&end=1723456200000&timeZone=Asia%2FShanghai');
  });

  it.each([
    ['30m', 30 * 60_000],
    ['1h', 60 * 60_000],
    ['6h', 6 * 60 * 60_000],
    ['24h', 24 * 60 * 60_000],
    ['1W', 24 * 60 * 60_000],
    ['4W', 24 * 60 * 60_000],
    ['12W', 24 * 60 * 60_000]
  ] as const)('turns the visible %s history range into one immutable exact window', (history, duration) => {
    expect(monitorInvestigationWindow(history, 1_800_000_000_000, 'Asia/Shanghai')).toEqual({
      from: 1_800_000_000_000 - duration,
      to: 1_800_000_000_000,
      timeZone: 'Asia/Shanghai'
    });
  });

  it.each([
    [
      { ...binding, monitorId: 41 },
      { from: 1_000, to: 2_000, timeZone: 'UTC' }
    ],
    [
      { ...binding, entityId: 0 },
      { from: 1_000, to: 2_000, timeZone: 'UTC' }
    ],
    [
      { ...binding, serviceName: ' ' },
      { from: 1_000, to: 2_000, timeZone: 'UTC' }
    ],
    [binding, { from: 2_000, to: 1_000, timeZone: 'UTC' }],
    [binding, { from: 1_000, to: 2_000, timeZone: 'not/a-zone' }]
  ])('fails closed on mismatched identity or invalid time evidence %#', (candidate, window) => {
    expect(() => createMonitorInvestigation(monitor, candidate, window)).toThrow();
  });
});
