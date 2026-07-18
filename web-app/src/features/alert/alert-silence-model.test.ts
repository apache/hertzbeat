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
  AlertSilenceContractError,
  alertSilenceDraftFromDetail,
  buildAlertSilencePayload,
  changeAlertSilenceType,
  createAlertSilenceDraft,
  readAlertSilenceQuery,
  validateAlertSilenceDraft,
  writeAlertSilenceQuery
} from './alert-silence-model';

describe('alert silence model', () => {
  it('normalizes unsupported URL pagination without discarding search context', () => {
    expect(readAlertSilenceQuery(new URLSearchParams('search=%20prod%20&pageIndex=-2&pageSize=999')))
      .toEqual({ search: 'prod', pageIndex: 0, pageSize: 8 });
    expect(writeAlertSilenceQuery({ search: 'maintenance', pageIndex: 1, pageSize: 15 }).toString())
      .toBe('pageIndex=1&pageSize=15&search=maintenance');
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
    expect(Date.parse(payload.periodStart!)).toBeLessThan(Date.parse(payload.periodEnd!));
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

  it('keeps an invalid recurring clock editable when changing schedule type', () => {
    const invalidRecurring = {
      ...createAlertSilenceDraft(),
      type: 1 as const,
      periodStart: 'not-a-time',
      periodEnd: '25:99'
    };

    expect(() => changeAlertSilenceType(invalidRecurring, 0)).not.toThrow();
    expect(changeAlertSilenceType(invalidRecurring, 0)).toMatchObject({
      type: 0,
      periodStart: '',
      periodEnd: ''
    });
  });

  it('preserves nullable persisted fields when only the name changes', () => {
    const draft = alertSilenceDraftFromDetail({
      id: 41,
      name: 'Legacy maintenance',
      enable: true,
      matchAll: true,
      type: 0,
      times: null,
      labels: null,
      days: null,
      periodStart: null,
      periodEnd: null
    });

    expect(draft).toMatchObject({ labelsText: '', days: [], periodStart: '', periodEnd: '' });
    expect(buildAlertSilencePayload({ ...draft, name: 'Renamed maintenance' })).toMatchObject({
      id: 41,
      name: 'Renamed maintenance',
      times: null,
      labels: null,
      days: null,
      periodStart: null,
      periodEnd: null
    });
  });

  it('round-trips legacy writable values without normalizing an unrelated edit', () => {
    const legacy = {
      id: 42,
      name: 'Legacy recurring silence',
      enable: false,
      matchAll: false,
      type: 1 as const,
      times: 9,
      labels: { service: 'checkout', region: 'us-east-1' },
      days: [7, 1, 1, 5],
      periodStart: '2026-07-13T22:15:00+08:00',
      periodEnd: '2026-07-14T02:45:00+08:00'
    };

    const payload = buildAlertSilencePayload({
      ...alertSilenceDraftFromDetail(legacy),
      name: 'Renamed legacy silence'
    });

    expect(payload).toEqual({
      id: 42,
      name: 'Renamed legacy silence',
      enable: false,
      matchAll: false,
      type: 1,
      times: 9,
      labels: legacy.labels,
      days: legacy.days,
      periodStart: legacy.periodStart,
      periodEnd: legacy.periodEnd
    });
  });

  it('rejects invalid drafts at the payload boundary', () => {
    const valid = {
      ...createAlertSilenceDraft(),
      name: 'Maintenance',
      periodStart: '2026-07-13T10:00',
      periodEnd: '2026-07-13T12:00'
    };

    expect(() => buildAlertSilencePayload({ ...valid, name: ' ' }))
      .toThrow(AlertSilenceContractError);
    expect(() => buildAlertSilencePayload({ ...valid, matchAll: false, labelsText: '' }))
      .toThrow(AlertSilenceContractError);
    expect(() => buildAlertSilencePayload({ ...valid, type: 1, days: [0], periodStart: '10:00', periodEnd: '11:00' }))
      .toThrow(AlertSilenceContractError);
    expect(() => buildAlertSilencePayload({ ...valid, type: 1, days: [1], periodStart: '25:99', periodEnd: '11:00' }))
      .toThrow(AlertSilenceContractError);
    expect(() => buildAlertSilencePayload({ ...valid, periodStart: 'not-a-date' }))
      .toThrow(AlertSilenceContractError);
    expect(() => buildAlertSilencePayload({ ...valid, periodStart: '2026-02-30T10:00' }))
      .toThrow(AlertSilenceContractError);

    for (const id of [0, -1, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => buildAlertSilencePayload({ ...valid, id }))
        .toThrow(AlertSilenceContractError);
    }
  });

});
