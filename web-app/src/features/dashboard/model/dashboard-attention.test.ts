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
import type { AlertGroup } from '@/features/alert';
import { dashboardAlertSeverity, dashboardEventAge } from './dashboard-attention';

const group: AlertGroup = {
  id: 1,
  status: 'firing',
  groupLabels: null,
  commonLabels: null,
  commonAnnotations: null,
  alertFingerprints: null,
  gmtUpdate: null,
  alerts: []
};
describe('Start event presentation evidence', () => {
  it.each(['info', 'warning', 'critical', 'emergency'] as const)(
    'retains actual %s severity independently of firing status',
    severity => {
      expect(dashboardAlertSeverity({ ...group, commonLabels: { severity } })).toBe(severity);
    }
  );
  it('keeps missing and unrecognized severity neutral instead of inferring critical from firing', () => {
    expect(dashboardAlertSeverity(group)).toBe('unknown');
    expect(dashboardAlertSeverity({ ...group, commonLabels: { severity: 'major' } })).toBe('unknown');
  });
  it('does not select one severity from inconsistent child labels', () => {
    const child = {
      id: 1,
      status: 'firing' as const,
      labels: { severity: 'info' },
      annotations: null,
      content: null,
      triggerTimes: null,
      startAt: null,
      activeAt: null,
      endAt: null
    };
    expect(dashboardAlertSeverity({ ...group, alerts: [child] })).toBe('info');
    expect(
      dashboardAlertSeverity({ ...group, alerts: [child, { ...child, id: 2, labels: { severity: 'critical' } }] })
    ).toBe('unknown');
  });
  it('keeps absent or invalid event times distinct from a recent update', () => {
    for (const value of [undefined, null, '', 'invalid']) expect(dashboardEventAge(value, 10000)).toBeNull();
    expect(dashboardEventAge(0, 60000)).toEqual({ timestamp: 0, value: -1, unit: 'minute' });
  });
  it('uses the same source timestamp for relative labels and absolute-time tooltips', () => {
    expect(dashboardEventAge(10000, 25000)).toEqual({ timestamp: 10000, value: -15, unit: 'second' });
    expect(dashboardEventAge(0, 7200000)).toEqual({ timestamp: 0, value: -2, unit: 'hour' });
    expect(dashboardEventAge(0, 172800000)).toEqual({ timestamp: 0, value: -2, unit: 'day' });
    expect(dashboardEventAge(120000, 0)).toEqual({ timestamp: 120000, value: 2, unit: 'minute' });
  });
});
