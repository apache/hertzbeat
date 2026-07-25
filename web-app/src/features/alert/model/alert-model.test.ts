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
  alertFailureKind,
  alertWriteOutcome,
  AlertContractError,
  AlertRequestFailure,
  readAlertQuery,
  writeAlertQuery
} from './alert-model';

describe('alert center model', () => {
  it('normalizes URL-owned filters and pagination', () => {
    const query = readAlertQuery(
      new URLSearchParams(
        'search=checkout&status=FIRING&severity=critical&serviceName=checkout-api&serviceNamespace=payments' +
          '&environment=prod&pageIndex=-1&pageSize=99'
      )
    );

    expect(query).toEqual({
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      serviceName: 'checkout-api',
      serviceNamespace: 'payments',
      environment: 'prod',
      pageIndex: 0,
      pageSize: 8
    });
    expect(writeAlertQuery(query).toString()).toBe(
      'pageIndex=0&pageSize=8&search=checkout&status=firing&severity=critical' +
        '&serviceName=checkout-api&serviceNamespace=payments&environment=prod'
    );
  });

  it('normalizes unsupported enums and does not send empty filters', () => {
    const query = readAlertQuery(new URLSearchParams('status=unknown&severity=debug'));
    expect(query.status).toBe('');
    expect(query.severity).toBe('');
    expect(readAlertQuery(new URLSearchParams('severity=INFO')).severity).toBe('info');
    expect(
      writeAlertQuery({
        search: '',
        status: '',
        severity: '',
        serviceName: '',
        serviceNamespace: '',
        environment: '',
        pageIndex: 1,
        pageSize: 15
      }).toString()
    ).toBe('pageIndex=1&pageSize=15');
  });

  it('classifies only stable request evidence as unavailable', () => {
    expect(alertFailureKind(new AlertRequestFailure('unavailable'))).toBe('unavailable');
    expect(alertFailureKind(new AlertRequestFailure('error'))).toBe('error');
    expect(alertFailureKind(new AlertContractError('invalid contract'))).toBe('error');
    expect(alertFailureKind(new Error('unknown failure'))).toBe('error');
    expect(alertWriteOutcome(new AlertRequestFailure('error', 'rejected'))).toBe('rejected');
    expect(alertWriteOutcome(new Error('unknown failure'))).toBe('uncertain');
  });
});
