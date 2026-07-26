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

import { AlertContractError } from '../model/alert-model';
import { parseAlertGroupPage, parseAlertSummary } from './alert-schema';

const group = {
  id: 7,
  status: 'firing' as const,
  groupLabels: { alertname: 'HighLatency' },
  commonLabels: { severity: 'critical', 'service.name': 'checkout' },
  commonAnnotations: null,
  alertFingerprints: ['fingerprint-1'],
  alerts: [
    {
      id: 11,
      labels: { alertname: 'HighLatency', instance: 'checkout-1' },
      annotations: { summary: 'Checkout latency exceeded the threshold.' },
      content: 'Checkout latency is above 500 ms.',
      status: 'firing',
      triggerTimes: 3,
      startAt: 1784250000000,
      activeAt: 1784250060000,
      endAt: null,
      creator: 'ignored'
    }
  ],
  gmtUpdate: '2026-07-17 10:20:30',
  creator: 'ignored'
};

const firstPageQuery = {
  search: '',
  status: '',
  severity: '',
  serviceName: '',
  serviceNamespace: '',
  environment: '',
  pageIndex: 0,
  pageSize: 8
} as const;

describe('alert center wire schemas', () => {
  it('allowlists summary evidence and preserves the backend zero-total rate', () => {
    expect(
      parseAlertSummary({
        total: 10,
        dealNum: 4,
        rate: 40,
        priorityWarningNum: 2,
        priorityCriticalNum: 2,
        priorityEmergencyNum: 1,
        ignored: true
      })
    ).toEqual({
      total: 10,
      dealNum: 4,
      rate: 40,
      priorityWarningNum: 2,
      priorityCriticalNum: 2,
      priorityEmergencyNum: 1
    });
    expect(
      parseAlertSummary({
        total: 0,
        dealNum: 0,
        rate: 100,
        priorityWarningNum: 0,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0
      })
    ).toMatchObject({ total: 0, dealNum: 0, rate: 100 });
    expect(
      parseAlertSummary({
        total: 3,
        dealNum: 2,
        rate: 66.67,
        priorityWarningNum: 1,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0
      })
    ).toMatchObject({ total: 3, dealNum: 2, rate: 66.67 });
  });

  it.each([
    ['null summary', null],
    [
      'unsafe total',
      {
        total: Number.MAX_SAFE_INTEGER + 1,
        dealNum: 0,
        rate: 0,
        priorityWarningNum: 0,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0
      }
    ],
    [
      'processed count above total',
      { total: 3, dealNum: 4, rate: 100, priorityWarningNum: 0, priorityCriticalNum: 0, priorityEmergencyNum: 0 }
    ],
    [
      'active severities above remaining',
      { total: 3, dealNum: 2, rate: 66.67, priorityWarningNum: 1, priorityCriticalNum: 1, priorityEmergencyNum: 0 }
    ],
    [
      'inconsistent rate',
      { total: 3, dealNum: 2, rate: 65, priorityWarningNum: 1, priorityCriticalNum: 0, priorityEmergencyNum: 0 }
    ],
    [
      'over-precise rate drift',
      { total: 10, dealNum: 4, rate: 40.01, priorityWarningNum: 2, priorityCriticalNum: 2, priorityEmergencyNum: 1 }
    ]
  ])('rejects %s instead of presenting false summary evidence', (_label, value) => {
    expect(() => parseAlertSummary(value)).toThrow(AlertContractError);
  });

  it('allowlists a GroupAlert row and preserves server-local time verbatim', () => {
    expect(
      parseAlertGroupPage(
        {
          content: [group],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8,
          pageable: { ignored: true }
        },
        firstPageQuery
      )
    ).toEqual({
      content: [
        {
          id: 7,
          status: 'firing',
          groupLabels: { alertname: 'HighLatency' },
          commonLabels: { severity: 'critical', 'service.name': 'checkout' },
          commonAnnotations: null,
          alertFingerprints: ['fingerprint-1'],
          alerts: [
            {
              id: 11,
              labels: { alertname: 'HighLatency', instance: 'checkout-1' },
              annotations: { summary: 'Checkout latency exceeded the threshold.' },
              content: 'Checkout latency is above 500 ms.',
              status: 'firing',
              triggerTimes: 3,
              startAt: 1784250000000,
              activeAt: 1784250060000,
              endAt: null
            }
          ],
          gmtUpdate: '2026-07-17 10:20:30'
        }
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    expect(
      parseAlertGroupPage(
        {
          content: [
            {
              ...group,
              status: 'pending',
              groupLabels: null,
              commonLabels: null,
              commonAnnotations: null,
              alertFingerprints: null,
              alerts: [],
              gmtUpdate: null
            }
          ],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8
        },
        firstPageQuery
      ).content[0]
    ).toMatchObject({
      status: 'pending',
      groupLabels: null,
      commonLabels: null,
      commonAnnotations: null,
      alertFingerprints: null,
      alerts: [],
      gmtUpdate: null
    });
  });

  it('accepts the acknowledged group and child evidence produced by the status endpoint', () => {
    const acknowledged = {
      ...group,
      status: 'acknowledged',
      alerts: group.alerts.map(alert => ({ ...alert, status: 'acknowledged' }))
    };

    expect(
      parseAlertGroupPage(
        { content: [acknowledged], totalElements: 1, totalPages: 1, number: 0, size: 8 },
        firstPageQuery
      ).content[0]
    ).toMatchObject({
      status: 'acknowledged',
      alerts: [{ status: 'acknowledged' }]
    });
  });

  it('keeps a canonical empty page distinct from malformed page evidence', () => {
    expect(
      parseAlertGroupPage(
        {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 8
        },
        firstPageQuery
      )
    ).toEqual({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 });
    expect(() => parseAlertGroupPage(null, firstPageQuery)).toThrow(AlertContractError);
  });

  it.each([
    ['zero id', { ...group, id: 0 }],
    ['unsupported status', { ...group, status: 'unknown' }],
    ['unsupported severity', { ...group, commonLabels: { severity: 'debug' } }],
    ['unsupported child status', { ...group, alerts: [{ ...group.alerts[0], status: 'pending' }] }],
    ['negative child trigger count', { ...group, alerts: [{ ...group.alerts[0], triggerTimes: -1 }] }],
    ['unsafe child timestamp', { ...group, alerts: [{ ...group.alerts[0], activeAt: Number.MAX_SAFE_INTEGER + 1 }] }],
    ['unrenderable child timestamp', { ...group, alerts: [{ ...group.alerts[0], activeAt: 8_640_000_000_000_001 }] }],
    ['offset date-time', { ...group, gmtUpdate: '2026-07-17T10:20:30Z' }],
    ['invalid Java local date-time', { ...group, gmtUpdate: '2026-02-30 10:20:30' }]
  ])('rejects malformed row %s', (_label, row) => {
    expect(() =>
      parseAlertGroupPage(
        {
          content: [row],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8
        },
        firstPageQuery
      )
    ).toThrow(AlertContractError);
  });

  it('validates request identity, total pages, final-page capacity, and unique ids', () => {
    const overflowQuery = { ...firstPageQuery, pageIndex: 2 };
    expect(
      parseAlertGroupPage(
        {
          content: [],
          totalElements: 9,
          totalPages: 2,
          number: 2,
          size: 8
        },
        overflowQuery
      )
    ).toMatchObject({ content: [], totalElements: 9, number: 2 });
    expect(() =>
      parseAlertGroupPage(
        {
          content: [group],
          totalElements: 9,
          totalPages: 2,
          number: 2,
          size: 8
        },
        overflowQuery
      )
    ).toThrow(AlertContractError);
    expect(() =>
      parseAlertGroupPage(
        {
          content: [group],
          totalElements: 9,
          totalPages: 1,
          number: 2,
          size: 8
        },
        overflowQuery
      )
    ).toThrow(AlertContractError);
    expect(() =>
      parseAlertGroupPage(
        {
          content: [group, group],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 8
        },
        firstPageQuery
      )
    ).toThrow(AlertContractError);
    expect(() =>
      parseAlertGroupPage(
        {
          content: [{ ...group, alerts: [group.alerts[0], group.alerts[0]] }],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8
        },
        firstPageQuery
      )
    ).toThrow(AlertContractError);
    expect(() =>
      parseAlertGroupPage(
        {
          content: [group],
          totalElements: 1,
          totalPages: 1,
          number: 1,
          size: 8
        },
        firstPageQuery
      )
    ).toThrow(AlertContractError);
  });

  it.each([
    [
      'a short non-last page',
      {
        content: Array.from({ length: 7 }, (_, index) => ({ ...group, id: index + 1 })),
        totalElements: 9,
        totalPages: 2,
        number: 0,
        size: 8
      },
      firstPageQuery
    ],
    [
      'a short last page',
      { content: [group], totalElements: 10, totalPages: 2, number: 1, size: 8 },
      { ...firstPageQuery, pageIndex: 1 }
    ]
  ])('rejects %s under an authoritative Spring total', (_name, page, query) => {
    expect(() => parseAlertGroupPage(page, query)).toThrow(AlertContractError);
  });

  it.each([
    ['status', { ...firstPageQuery, status: 'resolved' as const }],
    ['service name', { ...firstPageQuery, serviceName: 'payments' }],
    ['service namespace', { ...firstPageQuery, serviceNamespace: 'payments' }],
    ['environment', { ...firstPageQuery, environment: 'prod' }]
  ])('rejects a row outside the requested %s scope', (_name, query) => {
    expect(() =>
      parseAlertGroupPage({ content: [group], totalElements: 1, totalPages: 1, number: 0, size: 8 }, query)
    ).toThrow(AlertContractError);
  });

  it('accepts rows whose backend-compatible labels satisfy the complete requested scope', () => {
    const scopedGroup = {
      ...group,
      groupLabels: {
        service: 'checkout',
        service_namespace: 'payments',
        'deployment.environment': 'prod'
      }
    };
    const query = {
      ...firstPageQuery,
      status: 'firing' as const,
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod'
    };

    expect(
      parseAlertGroupPage({ content: [scopedGroup], totalElements: 1, totalPages: 1, number: 0, size: 8 }, query)
        .content
    ).toHaveLength(1);
  });
});
