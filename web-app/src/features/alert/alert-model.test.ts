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
  AlertContractError,
  buildAlertListPath,
  parseAlertGroupPage,
  parseAlertSummary,
  readAlertQuery
} from './alert-model';

const group = {
  id: 7,
  status: 'firing',
  groupLabels: { alertname: 'HighLatency' },
  commonLabels: { severity: 'critical', 'service.name': 'checkout' },
  commonAnnotations: null,
  alertFingerprints: ['fingerprint-1'],
  gmtUpdate: '2026-07-17 10:20:30',
  creator: 'ignored'
};

describe('alert center model', () => {
  it('normalizes URL-owned filters and pagination', () => {
    const query = readAlertQuery(new URLSearchParams(
      'search=checkout&status=FIRING&severity=critical&serviceName=checkout-api&serviceNamespace=payments'
      + '&environment=prod&pageIndex=-1&pageSize=99'
    ));

    expect(query).toEqual({
      search: 'checkout', status: 'firing', severity: 'critical', serviceName: 'checkout-api',
      serviceNamespace: 'payments', environment: 'prod', pageIndex: 0, pageSize: 8
    });
    expect(buildAlertListPath(query)).toBe(
      '/api/alerts/group?pageIndex=0&pageSize=8&search=checkout&status=firing&severity=critical'
      + '&serviceName=checkout-api&serviceNamespace=payments&environment=prod&sort=gmtUpdate&order=desc'
    );
  });

  it('normalizes unsupported enums and does not send empty filters', () => {
    const query = readAlertQuery(new URLSearchParams('status=unknown&severity=debug'));
    expect(query.status).toBe('');
    expect(query.severity).toBe('');
    expect(readAlertQuery(new URLSearchParams('severity=INFO')).severity).toBe('info');
    expect(buildAlertListPath({
      search: '', status: '', severity: '', serviceName: '', serviceNamespace: '', environment: '',
      pageIndex: 1, pageSize: 15
    }))
      .toBe('/api/alerts/group?pageIndex=1&pageSize=15&sort=gmtUpdate&order=desc');
  });

  it('allowlists summary evidence and rejects inconsistent or malformed counts', () => {
    expect(parseAlertSummary({
      total: 10, dealNum: 4, rate: 40, priorityWarningNum: 2,
      priorityCriticalNum: 2, priorityEmergencyNum: 1, ignored: true
    })).toEqual({
      total: 10, dealNum: 4, rate: 40, priorityWarningNum: 2,
      priorityCriticalNum: 2, priorityEmergencyNum: 1
    });
    expect(() => parseAlertSummary(null)).toThrow(AlertContractError);
    expect(parseAlertSummary({
      total: 0, dealNum: 0, rate: 100, priorityWarningNum: 0,
      priorityCriticalNum: 0, priorityEmergencyNum: 0
    })).toMatchObject({ total: 0, dealNum: 0, rate: 100 });
    expect(parseAlertSummary({
      total: 3, dealNum: 2, rate: 66.67, priorityWarningNum: 1,
      priorityCriticalNum: 0, priorityEmergencyNum: 0
    })).toMatchObject({ total: 3, dealNum: 2, rate: 66.67 });
    expect(() => parseAlertSummary({
      total: 3, dealNum: 2, rate: 66.67, priorityWarningNum: 1,
      priorityCriticalNum: 1, priorityEmergencyNum: 0
    })).toThrow(AlertContractError);
    expect(() => parseAlertSummary({
      total: 3, dealNum: 4, rate: 100, priorityWarningNum: 0,
      priorityCriticalNum: 0, priorityEmergencyNum: 0
    })).toThrow(AlertContractError);
    expect(() => parseAlertSummary({
      total: 3, dealNum: 2, rate: 65, priorityWarningNum: 1,
      priorityCriticalNum: 0, priorityEmergencyNum: 0
    })).toThrow(AlertContractError);
    expect(() => parseAlertSummary({
      total: 10, dealNum: 4, rate: 40.01, priorityWarningNum: 2,
      priorityCriticalNum: 2, priorityEmergencyNum: 1
    })).toThrow(AlertContractError);
  });

  it('parses an exact Java GroupAlert page and retains server-local time without conversion', () => {
    expect(parseAlertGroupPage({
      content: [group], totalElements: 1, totalPages: 1, number: 0, size: 8,
      pageable: { ignored: true }
    }, {
      search: '', status: '', severity: '', serviceName: '', serviceNamespace: '', environment: '',
      pageIndex: 0, pageSize: 8
    })).toEqual({
      content: [{
        id: 7, status: 'firing', groupLabels: { alertname: 'HighLatency' },
        commonLabels: { severity: 'critical', 'service.name': 'checkout' }, commonAnnotations: null,
        alertFingerprints: ['fingerprint-1'], gmtUpdate: '2026-07-17 10:20:30'
      }],
      totalElements: 1, totalPages: 1, number: 0, size: 8
    });
    expect(parseAlertGroupPage({
      content: [{ ...group, status: 'pending' }], totalElements: 1, totalPages: 1, number: 0, size: 8
    }, {
      search: '', status: '', severity: '', serviceName: '', serviceNamespace: '', environment: '',
      pageIndex: 0, pageSize: 8
    }).content[0]?.status).toBe('pending');
  });

  it('requires requested page evidence, offset-aware content, unique ids, and exact row domains', () => {
    const query = {
      search: '', status: '', severity: '', serviceName: '', serviceNamespace: '', environment: '',
      pageIndex: 2, pageSize: 8
    } as const;
    expect(parseAlertGroupPage({
      content: [], totalElements: 9, totalPages: 2, number: 2, size: 8
    }, query)).toMatchObject({ content: [], totalElements: 9, number: 2 });
    expect(() => parseAlertGroupPage({
      content: [group], totalElements: 9, totalPages: 2, number: 2, size: 8
    }, query)).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [group, group], totalElements: 2, totalPages: 1, number: 0, size: 8
    }, { ...query, pageIndex: 0 })).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [group], totalElements: 1, totalPages: 1, number: 1, size: 8
    }, { ...query, pageIndex: 0 })).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [{ ...group, id: 0 }], totalElements: 1, totalPages: 1, number: 0, size: 8
    }, { ...query, pageIndex: 0 })).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [{ ...group, status: 'unknown' }], totalElements: 1, totalPages: 1, number: 0, size: 8
    }, { ...query, pageIndex: 0 })).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [{ ...group, commonLabels: { severity: 'debug' } }],
      totalElements: 1, totalPages: 1, number: 0, size: 8
    }, { ...query, pageIndex: 0 })).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [{ ...group, gmtUpdate: '2026-07-17T10:20:30Z' }],
      totalElements: 1, totalPages: 1, number: 0, size: 8
    }, { ...query, pageIndex: 0 })).toThrow(AlertContractError);
    expect(() => parseAlertGroupPage({
      content: [{ ...group, gmtUpdate: '2026-02-30 10:20:30' }],
      totalElements: 1, totalPages: 1, number: 0, size: 8
    }, { ...query, pageIndex: 0 })).toThrow(AlertContractError);
  });
});
