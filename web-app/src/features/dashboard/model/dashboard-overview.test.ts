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
import { monitorDistribution, savedContinueItems, dashboardAlertTarget } from './dashboard-overview';

describe('start overview evidence', () => {
  it('preserves the backend total without deriving or reallocating omitted statuses', () => {
    expect(monitorDistribution(10, [1, 5, 2])).toEqual({ total: 10, counts: [1, 5, 2] });
    expect(monitorDistribution(0, [0, 0, 0])).toEqual({ total: 0, counts: [0, 0, 0] });
    expect(monitorDistribution(2, [0, 2, 1])).toBeNull();
  });
  it('uses a firing child identity and its exact time window for alert investigation', () => {
    const group = {
      id: 9,
      status: 'firing' as const,
      groupLabels: null,
      commonLabels: null,
      commonAnnotations: null,
      alertFingerprints: null,
      gmtUpdate: null,
      alerts: [
        {
          id: 23,
          status: 'firing' as const,
          labels: null,
          annotations: null,
          content: null,
          triggerTimes: null,
          startAt: 1700000000000,
          activeAt: 1700000000000,
          endAt: null
        }
      ]
    };
    const target = dashboardAlertTarget(group);
    expect(target).toContain('/alerts/23/investigate?');
    expect(target).toContain('start=1699999100000');
    expect(target).toContain('timeZone=UTC');
    expect(dashboardAlertTarget({ ...group, alerts: [] })).toBe('/alerts?status=firing');
  });
  it('does not substitute catalog objects for a users favorites or recents', () => {
    expect(savedContinueItems([], [], [])).toEqual([]);
    expect(
      savedContinueItems(
        [{ signal: 'logs', viewKey: 'unsafe', label: 'invalid', route: 'https://evil.test' }],
        ['unsafe'],
        []
      )
    ).toEqual([]);
  });
});

it('continues only real recently opened queries in recent order, excluding favorite-only items', () => {
  const records = ['favorite-only', 'recent-two', 'recent-one'].map(key => ({
    signal: 'metrics' as const,
    viewKey: key,
    label: key,
    route: '/explore?signal=metrics',
    payload: JSON.stringify({ version: 1, query: { signal: 'metrics', timeRange: 'last-15m' } })
  }));
  expect(
    savedContinueItems(
      records,
      ['favorite-only', 'recent-one'],
      ['recent-one', 'missing', 'recent-two', 'recent-one']
    ).map(item => [item.record.viewKey, item.favorite])
  ).toEqual([
    ['recent-one', true],
    ['recent-two', false]
  ]);
});
