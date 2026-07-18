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

import { AlertContractError } from './alert-model';
import { parseAlertGroupPage, parseAlertSummary } from './alert-schema';

const group = {
  id: 7,
  status: 'firing' as const,
  groupLabels: { alertname: 'HighLatency' },
  commonLabels: { severity: 'critical', 'service.name': 'checkout' },
  commonAnnotations: null,
  alertFingerprints: ['fingerprint-1'],
  gmtUpdate: '2026-07-17 10:20:30',
  creator: 'ignored'
};

const firstPageQuery = {
  search: '', status: '', severity: '', serviceName: '', serviceNamespace: '', environment: '',
  pageIndex: 0, pageSize: 8
} as const;

describe('alert center wire schemas', () => {
  it('allowlists summary evidence and preserves the backend zero-total rate', () => {
    expect(parseAlertSummary({
      total: 10, dealNum: 4, rate: 40, priorityWarningNum: 2,
      priorityCriticalNum: 2, priorityEmergencyNum: 1, ignored: true
    })).toEqual({
      total: 10, dealNum: 4, rate: 40, priorityWarningNum: 2,
      priorityCriticalNum: 2, priorityEmergencyNum: 1
    });
    expect(parseAlertSummary({
      total: 0, dealNum: 0, rate: 100, priorityWarningNum: 0,
      priorityCriticalNum: 0, priorityEmergencyNum: 0
    })).toMatchObject({ total: 0, dealNum: 0, rate: 100 });
    expect(parseAlertSummary({
      total: 3, dealNum: 2, rate: 66.67, priorityWarningNum: 1,
      priorityCriticalNum: 0, priorityEmergencyNum: 0
    })).toMatchObject({ total: 3, dealNum: 2, rate: 66.67 });
  });

  it.each([
    ['null summary', null],
    ['unsafe total', { total: Number.MAX_SAFE_INTEGER + 1, dealNum: 0, rate: 0,
      priorityWarningNum: 0, priorityCriticalNum: 0, priorityEmergencyNum: 0 }],
    ['processed count above total', { total: 3, dealNum: 4, rate: 100,
      priorityWarningNum: 0, priorityCriticalNum: 0, priorityEmergencyNum: 0 }],
    ['active severities above remaining', { total: 3, dealNum: 2, rate: 66.67,
      priorityWarningNum: 1, priorityCriticalNum: 1, priorityEmergencyNum: 0 }],
    ['inconsistent rate', { total: 3, dealNum: 2, rate: 65,
      priorityWarningNum: 1, priorityCriticalNum: 0, priorityEmergencyNum: 0 }],
    ['over-precise rate drift', { total: 10, dealNum: 4, rate: 40.01,
      priorityWarningNum: 2, priorityCriticalNum: 2, priorityEmergencyNum: 1 }]
  ])('rejects %s instead of presenting false summary evidence', (_label, value) => {
    expect(() => parseAlertSummary(value)).toThrow(AlertContractError);
  });

  it('allowlists a GroupAlert row and preserves server-local time verbatim', () => {
    expect(parseAlertGroupPage({
      content: [group], totalElements: 1, totalPages: 1, number: 0, size: 8,
      pageable: { ignored: true }
    }, firstPageQuery)).toEqual({
      content: [{
        id: 7, status: 'firing', groupLabels: { alertname: 'HighLatency' },
        commonLabels: { severity: 'critical', 'service.name': 'checkout' }, commonAnnotations: null,
        alertFingerprints: ['fingerprint-1'], gmtUpdate: '2026-07-17 10:20:30'
      }],
      totalElements: 1, totalPages: 1, number: 0, size: 8
    });
    expect(parseAlertGroupPage({
      content: [{
        ...group,
        status: 'pending',
        groupLabels: null,
        commonLabels: null,
        commonAnnotations: null,
        alertFingerprints: null,
        gmtUpdate: null
      }],
      totalElements: 1, totalPages: 1, number: 0, size: 8
    }, firstPageQuery).content[0]).toMatchObject({
      status: 'pending', groupLabels: null, commonLabels: null, commonAnnotations: null,
      alertFingerprints: null, gmtUpdate: null
    });
  });

  it('keeps a canonical empty page distinct from malformed page evidence', () => {
    expect(parseAlertGroupPage({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 8
    }, firstPageQuery)).toEqual({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 });
    expect(() => parseAlertGroupPage(null, firstPageQuery)).toThrow(AlertContractError);
  });

  it.each([
    ['zero id', { ...group, id: 0 }],
    ['unsupported status', { ...group, status: 'unknown' }],
    ['unsupported severity', { ...group, commonLabels: { severity: 'debug' } }],
    ['offset date-time', { ...group, gmtUpdate: '2026-07-17T10:20:30Z' }],
    ['invalid Java local date-time', { ...group, gmtUpdate: '2026-02-30 10:20:30' }]
  ])('rejects malformed row %s', (_label, row) => {
    expect(() => parseAlertGroupPage({
      content: [row], totalElements: 1, totalPages: 1, number: 0, size: 8
    }, firstPageQuery)).toThrow(AlertContractError);
  });

  it('validates request identity, total pages, final-page capacity, and unique ids', () => {
    const overflowQuery = { ...firstPageQuery, pageIndex: 2 };
    expect(parseAlertGroupPage({
      content: [], totalElements: 9, totalPages: 2, number: 2, size: 8
    }, overflowQuery)).toMatchObject({ content: [], totalElements: 9, number: 2 });
    expect(() => parseAlertGroupPage({
      content: [group], totalElements: 9, totalPages: 2, number: 2, size: 8
    }, overflowQuery)).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [group], totalElements: 9, totalPages: 1, number: 2, size: 8
    }, overflowQuery)).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [group, group], totalElements: 2, totalPages: 1, number: 0, size: 8
    }, firstPageQuery)).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [group], totalElements: 1, totalPages: 1, number: 1, size: 8
    }, firstPageQuery)).toThrow(AlertContractError);
  });
});
