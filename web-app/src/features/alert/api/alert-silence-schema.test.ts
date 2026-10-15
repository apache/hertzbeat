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

import { AlertSilenceContractError, AlertSilenceMissingError } from '../model/alert-silence-model';
import { parseAlertSilenceDetail, parseAlertSilencePage } from './alert-silence-schema';

const persisted = {
  id: 7,
  name: 'Maintenance',
  enable: true,
  matchAll: false,
  type: 1 as const,
  times: null,
  labels: { service: 'checkout' },
  days: [1, 3, 5],
  periodStart: '2026-07-13T22:00:00+08:00',
  periodEnd: '2026-07-14T02:00:00+08:00',
  creator: null,
  modifier: 'operator',
  gmtCreate: '2026-07-13T09:00:00',
  gmtUpdate: null
};

describe('alert silence wire schemas', () => {
  it('allowlists detail fields and preserves audit absence separately from null', () => {
    expect(parseAlertSilenceDetail({ ...persisted, ignored: 'wire-only' })).toEqual(persisted);
    const withoutAudit: Record<string, unknown> = { ...persisted };
    delete withoutAudit.creator;
    delete withoutAudit.modifier;
    delete withoutAudit.gmtCreate;
    delete withoutAudit.gmtUpdate;
    expect(parseAlertSilenceDetail(withoutAudit)).toEqual(withoutAudit);
  });

  it.each([
    ['unsafe id', { ...persisted, id: Number.MAX_SAFE_INTEGER + 1 }],
    ['oversized name', { ...persisted, name: 'x'.repeat(101) }],
    ['numeric enablement', { ...persisted, enable: 1 }],
    ['unsupported type', { ...persisted, type: 2 }],
    ['negative times', { ...persisted, times: -1 }],
    ['blank label key', { ...persisted, labels: { ' ': 'checkout' } }],
    ['duplicate day', { ...persisted, days: [1, 1] }],
    ['out-of-range day', { ...persisted, days: [8] }],
    ['period without offset', { ...persisted, periodStart: '2026-07-13T22:00:00' }],
    ['invalid offset date', { ...persisted, periodStart: '2026-02-30T22:00:00+08:00' }],
    ['invalid Java local date-time', { ...persisted, gmtCreate: '2026-02-30T09:00:00' }]
  ])('rejects malformed %s evidence', (_label, value) => {
    expect(() => parseAlertSilenceDetail(value)).toThrow(AlertSilenceContractError);
  });

  it('keeps missing detail distinct from malformed detail', () => {
    expect(() => parseAlertSilenceDetail(null)).toThrow(AlertSilenceMissingError);
    expect(() => parseAlertSilenceDetail({})).toThrow(AlertSilenceContractError);
  });

  it('validates Spring page identity, totals, final-page capacity, and unique ids', () => {
    const query = { search: '', pageIndex: 1, pageSize: 15 };
    expect(
      parseAlertSilencePage(
        {
          content: [persisted],
          totalElements: 16,
          totalPages: 2,
          number: 1,
          size: 15,
          ignored: true
        },
        query
      )
    ).toEqual({ content: [persisted], totalElements: 16, totalPages: 2, number: 1, size: 15 });
    expect(() =>
      parseAlertSilencePage(
        {
          content: [persisted],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8
        },
        query
      )
    ).toThrow(AlertSilenceContractError);
    expect(() =>
      parseAlertSilencePage(
        {
          content: [persisted],
          totalElements: 16,
          totalPages: 1,
          number: 1,
          size: 15
        },
        query
      )
    ).toThrow(AlertSilenceContractError);
    expect(() =>
      parseAlertSilencePage(
        {
          content: [persisted, persisted],
          totalElements: 17,
          totalPages: 2,
          number: 1,
          size: 15
        },
        query
      )
    ).toThrow(AlertSilenceContractError);
  });

  it('rejects a short non-final Spring page', () => {
    const content = Array.from({ length: 14 }, (_, index) => ({ ...persisted, id: index + 1 }));

    expect(() =>
      parseAlertSilencePage(
        {
          content,
          totalElements: 31,
          totalPages: 3,
          number: 0,
          size: 15
        },
        { search: '', pageIndex: 0, pageSize: 15 }
      )
    ).toThrow(AlertSilenceContractError);
  });

  it('rejects a short final Spring page', () => {
    expect(() =>
      parseAlertSilencePage(
        {
          content: [persisted],
          totalElements: 17,
          totalPages: 2,
          number: 1,
          size: 15
        },
        { search: '', pageIndex: 1, pageSize: 15 }
      )
    ).toThrow(AlertSilenceContractError);
  });

  it('accepts an empty page beyond the final Spring page', () => {
    expect(
      parseAlertSilencePage(
        {
          content: [],
          totalElements: 17,
          totalPages: 2,
          number: 4,
          size: 15
        },
        { search: '', pageIndex: 4, pageSize: 15 }
      )
    ).toEqual({
      content: [],
      totalElements: 17,
      totalPages: 2,
      number: 4,
      size: 15
    });
  });
});
