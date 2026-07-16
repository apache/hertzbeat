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
  AlertSilenceMissingError,
  buildAlertSilenceListPath,
  buildAlertSilencePayload,
  changeAlertSilenceType,
  createAlertSilenceDraft,
  parseAlertSilenceDetail,
  parseAlertSilencePage,
  readAlertSilenceQuery,
  validateAlertSilenceDraft
} from './alert-silence-model';

describe('alert silence model', () => {
  it('builds the master pagination and search contract', () => {
    expect(buildAlertSilenceListPath({ search: '', pageIndex: 0, pageSize: 8 }))
      .toBe('/api/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(buildAlertSilenceListPath({ search: 'maintenance', pageIndex: 1, pageSize: 15 }))
      .toBe('/api/alert/silences?pageIndex=1&pageSize=15&sort=id&order=desc&search=maintenance');
  });

  it('normalizes unsupported URL pagination without discarding search context', () => {
    expect(readAlertSilenceQuery(new URLSearchParams('search=%20prod%20&pageIndex=-2&pageSize=999')))
      .toEqual({ search: 'prod', pageIndex: 0, pageSize: 8 });
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

  it('allowlists a complete persisted detail and preserves honest nullable fields', () => {
    expect(parseAlertSilenceDetail({
      id: 7,
      name: 'Maintenance',
      enable: true,
      matchAll: false,
      type: 1,
      times: null,
      labels: { service: 'checkout' },
      days: [1, 3, 5],
      periodStart: '2026-07-13T22:00:00+08:00',
      periodEnd: '2026-07-14T02:00:00+08:00',
      creator: null,
      modifier: 'operator',
      gmtCreate: '2026-07-13T09:00:00',
      gmtUpdate: null,
      ignored: 'wire-only'
    })).toEqual({
      id: 7,
      name: 'Maintenance',
      enable: true,
      matchAll: false,
      type: 1,
      times: null,
      labels: { service: 'checkout' },
      days: [1, 3, 5],
      periodStart: '2026-07-13T22:00:00+08:00',
      periodEnd: '2026-07-14T02:00:00+08:00',
      creator: null,
      modifier: 'operator',
      gmtCreate: '2026-07-13T09:00:00',
      gmtUpdate: null
    });
  });

  it('rejects missing details and malformed persisted domains instead of inventing defaults', () => {
    expect(() => parseAlertSilenceDetail(null)).toThrow(AlertSilenceMissingError);
    expect(() => parseAlertSilenceDetail({
      id: 7, name: 'Maintenance', enable: 1, matchAll: true, type: 0,
      times: null, labels: null, days: null, periodStart: null, periodEnd: null
    })).toThrow(AlertSilenceContractError);
    expect(() => parseAlertSilenceDetail({
      id: 7, name: 'Maintenance', enable: true, matchAll: true, type: 1,
      times: 0, labels: {}, days: [1, 1], periodStart: '22:00', periodEnd: '02:00'
    })).toThrow(AlertSilenceContractError);
    expect(() => parseAlertSilenceDetail({
      id: 7, name: 'Maintenance', enable: true, matchAll: true, type: 0,
      times: 0, labels: {}, days: [], periodStart: '2026-07-13T10:00:00', periodEnd: null
    })).toThrow(AlertSilenceContractError);
  });

  it('requires exact requested page evidence and rejects duplicate identities', () => {
    const query = { search: '', pageIndex: 0, pageSize: 8 };
    const record = {
      id: 7, name: 'Maintenance', enable: true, matchAll: true, type: 0,
      times: null, labels: null, days: null, periodStart: null, periodEnd: null
    };
    expect(parseAlertSilencePage({
      content: [record], totalElements: 1, totalPages: 1, number: 0, size: 8
    }, query)).toMatchObject({ content: [{ id: 7 }], totalElements: 1, number: 0, size: 8 });
    expect(parseAlertSilencePage({
      content: [], totalElements: 9, totalPages: 2, number: 2, size: 8
    }, { ...query, pageIndex: 2 })).toMatchObject({ content: [], totalElements: 9, number: 2 });
    expect(() => parseAlertSilencePage({
      content: [record], totalElements: 9, totalPages: 2, number: 2, size: 8
    }, { ...query, pageIndex: 2 })).toThrow(AlertSilenceContractError);
    expect(() => parseAlertSilencePage({
      content: [record], totalElements: 1, totalPages: 1, number: 1, size: 8
    }, query)).toThrow(AlertSilenceContractError);
    expect(() => parseAlertSilencePage({
      content: [record, record], totalElements: 2, totalPages: 1, number: 0, size: 8
    }, query)).toThrow(AlertSilenceContractError);
  });
});
