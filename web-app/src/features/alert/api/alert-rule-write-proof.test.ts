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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ loadAlertRule: vi.fn(), loadAlertRules: vi.fn() }));
vi.mock('./alert-rule-api', async importOriginal => ({
  ...(await importOriginal<typeof import('./alert-rule-api')>()),
  ...api
}));

import {
  buildAlertRulePayload,
  createAlertRuleDraft,
  type AlertRule,
  type AlertRuleQuery
} from '../model/alert-rule-model';
import {
  AlertRuleCreateProofLimitError,
  captureAlertRuleCreateBaseline,
  maximumAlertRuleCreateProofPages,
  proveCreatedAlertRule
} from './alert-rule-write-proof';

const expected = buildAlertRulePayload({
  ...createAlertRuleDraft(),
  name: 'New Rule',
  expr: 'usage > 90',
  template: 'Alert'
});
const matching: AlertRule = {
  id: 9,
  ...expected,
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: null
};

describe('Alert Rule write proof', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([Number.NaN, -1, 1.5, maximumAlertRuleCreateProofPages + 1])(
    'rejects invalid or over-limit page count %s with a stable error before another read',
    async totalPages => {
      api.loadAlertRules.mockResolvedValueOnce({
        content: [matching],
        totalElements: 1,
        totalPages,
        number: 0,
        size: 25
      });

      await expect(proveCreatedAlertRule(expected, [])).rejects.toBeInstanceOf(AlertRuleCreateProofLimitError);
      expect(api.loadAlertRules).toHaveBeenCalledTimes(1);
    }
  );

  it('finds one converged rule across a small stable page set', async () => {
    api.loadAlertRules.mockImplementation((query: AlertRuleQuery) =>
      Promise.resolve({
        content: query.pageIndex === 1 ? [matching] : [],
        totalElements: 26,
        totalPages: 2,
        number: query.pageIndex,
        size: query.pageSize
      })
    );

    await expect(proveCreatedAlertRule(expected, [])).resolves.toBeUndefined();
    expect(api.loadAlertRules).toHaveBeenCalledTimes(2);
  });

  it('captures exact-name ids and proves only one post-write identity absent from the baseline', async () => {
    const existing = { ...matching, id: 7 };
    const created = { ...matching, id: 9 };
    api.loadAlertRules.mockResolvedValueOnce({
      content: [existing],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 25
    });
    await expect(captureAlertRuleCreateBaseline(expected.name)).resolves.toEqual([7]);

    api.loadAlertRules.mockResolvedValueOnce({
      content: [existing, created],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 25
    });
    await expect(proveCreatedAlertRule(expected, [7])).resolves.toBeUndefined();
  });
});
