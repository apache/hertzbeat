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

import { parseAlertSummary as parseAlertCenterSummary } from '@/features/alert/api/alert-schema';
import { AlertContractError } from '@/features/alert/model/alert-model';
import { parseAlertSummary as parseDashboardAlertSummary } from '@/features/dashboard/api/dashboard-schema';
import { DashboardContractError } from '@/features/dashboard/model/dashboard-model';
import type { AlertSummaryWire } from '@/shared/alert-summary/alert-summary-contract';

const invalidSummaries = [
  {
    label: 'a percentage above 100',
    value: summary({ total: 1, dealNum: 1, rate: 101 })
  },
  {
    label: 'a processed count above the total',
    value: summary({ total: 1, dealNum: 2, rate: 100 })
  },
  {
    label: 'active severities above the unprocessed count',
    value: summary({ total: 5, dealNum: 3, rate: 60, priorityWarningNum: 3 })
  },
  {
    label: 'an empty history that is not fully handled',
    value: summary({ total: 0, dealNum: 0, rate: 0 })
  },
  {
    label: 'a rate inconsistent with backend rounding',
    value: summary({ total: 3, dealNum: 1, rate: 33.34 })
  }
] as const;

describe('alert summary consumer parity', () => {
  it.each(invalidSummaries)('rejects $label in both consumers', ({ value }) => {
    expect(() => parseAlertCenterSummary(value)).toThrow(AlertContractError);
    expect(() => parseDashboardAlertSummary(value)).toThrow(DashboardContractError);
  });
});

function summary(overrides: Partial<AlertSummaryWire>) {
  return {
    total: 3,
    dealNum: 1,
    rate: 33.33,
    priorityWarningNum: 0,
    priorityCriticalNum: 0,
    priorityEmergencyNum: 0,
    ...overrides
  };
}
