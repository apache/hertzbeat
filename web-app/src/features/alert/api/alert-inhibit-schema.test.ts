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

import { AlertInhibitContractError, AlertInhibitMissingError } from '../model/alert-inhibit-model';
import { parseAlertInhibitDetail, parseAlertInhibitPage } from './alert-inhibit-schema';

const persisted = {
  id: 9,
  name: 'Critical suppresses warning',
  sourceLabels: { severity: 'critical', service: 'checkout' },
  targetLabels: { severity: 'warning', service: 'checkout' },
  equalLabels: ['service'],
  enable: true,
  creator: 'operator',
  modifier: null,
  gmtCreate: '2026-07-17T08:00:00',
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('alert inhibit wire schemas', () => {
  it('allowlists detail fields and preserves nullable Java entity values', () => {
    expect(parseAlertInhibitDetail({ ...persisted, responseOnly: 'discard' })).toEqual(persisted);
    const withoutAudit: Record<string, unknown> = { ...persisted };
    delete withoutAudit.creator;
    delete withoutAudit.modifier;
    delete withoutAudit.gmtCreate;
    delete withoutAudit.gmtUpdate;
    expect(parseAlertInhibitDetail(withoutAudit)).toEqual(withoutAudit);
    expect(
      parseAlertInhibitDetail({
        ...persisted,
        sourceLabels: null,
        targetLabels: null,
        equalLabels: null,
        enable: null,
        gmtCreate: null,
        gmtUpdate: null
      })
    ).toMatchObject({
      sourceLabels: null,
      targetLabels: null,
      equalLabels: null,
      enable: null,
      gmtCreate: null,
      gmtUpdate: null
    });
  });

  it.each([
    ['unsafe id', { ...persisted, id: Number.MAX_SAFE_INTEGER + 1 }],
    ['blank name', { ...persisted, name: '  ' }],
    ['invalid source map', { ...persisted, sourceLabels: { severity: 1 } }],
    ['blank target key', { ...persisted, targetLabels: { ' ': 'warning' } }],
    ['duplicate equal label', { ...persisted, equalLabels: ['service', 'service'] }],
    ['string enablement', { ...persisted, enable: 'true' }],
    ['invalid audit time', { ...persisted, gmtUpdate: '2026-02-30T09:00:00' }]
  ])('rejects malformed %s evidence', (_label, value) => {
    expect(() => parseAlertInhibitDetail(value)).toThrow(AlertInhibitContractError);
  });

  it('keeps missing detail distinct from malformed detail', () => {
    expect(() => parseAlertInhibitDetail(null)).toThrow(AlertInhibitMissingError);
    expect(() => parseAlertInhibitDetail({})).toThrow(AlertInhibitContractError);
  });

  it('validates Spring page consistency, request identity, capacity, and unique ids', () => {
    const query = { search: '', pageIndex: 1, pageSize: 15 };
    expect(
      parseAlertInhibitPage(
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
      parseAlertInhibitPage(
        {
          content: [persisted],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8
        },
        query
      )
    ).toThrow(AlertInhibitContractError);
    expect(() =>
      parseAlertInhibitPage(
        {
          content: [persisted],
          totalElements: 16,
          totalPages: 1,
          number: 1,
          size: 15
        },
        query
      )
    ).toThrow(AlertInhibitContractError);
    expect(() =>
      parseAlertInhibitPage(
        {
          content: [persisted, persisted],
          totalElements: 17,
          totalPages: 2,
          number: 1,
          size: 15
        },
        query
      )
    ).toThrow(AlertInhibitContractError);
  });

  it.each([
    [
      'a short non-last page',
      {
        content: Array.from({ length: 7 }, (_, index) => ({ ...persisted, id: index + 1 })),
        totalElements: 10,
        totalPages: 2,
        number: 0,
        size: 8
      },
      { search: '', pageIndex: 0, pageSize: 8 }
    ],
    [
      'a short last page',
      { content: [persisted], totalElements: 10, totalPages: 2, number: 1, size: 8 },
      { search: '', pageIndex: 1, pageSize: 8 }
    ]
  ])('rejects %s under an authoritative Spring total', (_name, page, query) => {
    expect(() => parseAlertInhibitPage(page, query)).toThrow(AlertInhibitContractError);
  });

  it('accepts an empty page beyond the authoritative result range', () => {
    expect(
      parseAlertInhibitPage(
        { content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 },
        { search: '', pageIndex: 2, pageSize: 8 }
      )
    ).toEqual({ content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 });
  });
});
