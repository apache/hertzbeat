/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
  buildAlertSilenceListPath,
  buildAlertSilencePayload,
  changeAlertSilenceType,
  createAlertSilenceDraft,
  validateAlertSilenceDraft
} from './alert-silence-model';

describe('alert silence model', () => {
  it('builds the master pagination and search contract', () => {
    expect(buildAlertSilenceListPath({ search: '', pageIndex: 0, pageSize: 8 }))
      .toBe('/api/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(buildAlertSilenceListPath({ search: 'maintenance', pageIndex: 1, pageSize: 15 }))
      .toBe('/api/alert/silences?pageIndex=1&pageSize=15&sort=id&order=desc&search=maintenance');
  });

  it('builds a label-scoped one-time silence payload', () => {
    const draft = {
      ...createAlertSilenceDraft(),
      name: 'Checkout maintenance',
      matchAll: false,
      labelsText: 'service:checkout, environment:staging',
      periodStart: '2026-07-13T10:00',
      periodEnd: '2026-07-13T12:00',
      enable: false
    };
    const payload = buildAlertSilencePayload(draft);
    expect(payload).toMatchObject({
      name: 'Checkout maintenance',
      matchAll: false,
      labels: { service: 'checkout', environment: 'staging' },
      type: 0,
      days: [],
      enable: false
    });
    expect(Date.parse(payload.periodStart)).toBeLessThan(Date.parse(payload.periodEnd));
  });

  it('validates labels, selected days, and ordered time ranges', () => {
    expect(validateAlertSilenceDraft({
      ...createAlertSilenceDraft(),
      name: 'Invalid once',
      matchAll: false,
      periodStart: '2026-07-13T12:00',
      periodEnd: '2026-07-13T10:00'
    })).toEqual(['labels', 'period']);
    expect(validateAlertSilenceDraft({
      ...createAlertSilenceDraft(),
      name: 'Invalid recurring',
      type: 1,
      days: [],
      periodStart: '',
      periodEnd: '10:00'
    })).toEqual(['days', 'period']);
  });

  it('preserves the visible time window when changing schedule type', () => {
    const once = {
      ...createAlertSilenceDraft(),
      periodStart: '2026-07-13T22:00',
      periodEnd: '2026-07-14T02:00'
    };
    const recurring = changeAlertSilenceType(once, 1);
    expect(recurring).toMatchObject({ type: 1, periodStart: '22:00', periodEnd: '02:00' });
    const restored = changeAlertSilenceType(recurring, 0);
    expect(restored.type).toBe(0);
    expect(Date.parse(restored.periodStart)).toBeLessThan(Date.parse(restored.periodEnd));
  });
});
