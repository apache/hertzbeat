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

import { AlertSummaryContractError, alertSummaryEndpoint, parseAlertSummaryWire } from './alert-summary-contract';

const backendRoundedSummaries = [
  { total: 4_000, dealNum: 3_999, rate: 99.97 },
  { total: 10_001, dealNum: 5_000, rate: 49.99 },
  { total: 20_000, dealNum: 1, rate: 0 }
] as const;

describe('alert summary wire contract', () => {
  it('owns the endpoint and allowlists authoritative evidence', () => {
    expect(alertSummaryEndpoint).toBe('/api/alerts/summary');
    expect(
      parseAlertSummaryWire({
        total: 3,
        dealNum: 1,
        rate: 33.33,
        priorityWarningNum: 1,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0,
        internalCounter: 7
      })
    ).toEqual({
      total: 3,
      dealNum: 1,
      rate: 33.33,
      priorityWarningNum: 1,
      priorityCriticalNum: 0,
      priorityEmergencyNum: 0
    });
  });

  it('preserves the backend empty-history definition', () => {
    expect(
      parseAlertSummaryWire({
        total: 0,
        dealNum: 0,
        rate: 100,
        priorityWarningNum: 0,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0
      })
    ).toMatchObject({ total: 0, rate: 100 });
  });

  it.each(backendRoundedSummaries)(
    'accepts the backend float32 rate for $dealNum of $total handled alerts',
    ({ total, dealNum, rate }) => {
      expect(
        parseAlertSummaryWire({
          total,
          dealNum,
          rate,
          priorityWarningNum: 0,
          priorityCriticalNum: 0,
          priorityEmergencyNum: 0
        })
      ).toMatchObject({ total, dealNum, rate });
    }
  );

  it('reports malformed evidence with the shared boundary error', () => {
    expect(() =>
      parseAlertSummaryWire({
        total: 1,
        dealNum: 0,
        rate: 0,
        priorityWarningNum: 2,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0
      })
    ).toThrow(AlertSummaryContractError);
  });
});
