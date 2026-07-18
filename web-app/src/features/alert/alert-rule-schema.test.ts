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

import { AlertRuleContractError, AlertRuleMissingError, type AlertRuleQuery } from './alert-rule-model';
import { parseAlertRuleDetail, parseAlertRulePage, parseAlertRulePreview } from './alert-rule-schema';

const query: AlertRuleQuery = { search: '', pageIndex: 0, pageSize: 8 };
const persisted = {
  id: 7,
  name: 'Slow checkout',
  type: 'periodic_trace' as const,
  datasource: 'sql' as const,
  expr: 'SELECT duration AS __value__ FROM spans',
  period: 300,
  times: 2,
  labels: { team: 'platform' },
  annotations: { summary: 'Checkout is slow' },
  template: 'Checkout latency {{ $value }}',
  enable: true,
  creator: 'operator',
  modifier: null,
  gmtCreate: '2026-07-17T09:00:00',
  gmtUpdate: null
};

describe('alert rule wire schemas', () => {
  it('allowlists detail fields and preserves legacy nullable strategy and text', () => {
    expect(parseAlertRuleDetail({ ...persisted, serverOnly: 'discard' })).toEqual(persisted);
    expect(parseAlertRuleDetail({
      ...persisted,
      type: null,
      datasource: null,
      expr: null,
      period: null,
      times: null,
      labels: null,
      annotations: null,
      template: null
    })).toMatchObject({
      type: null, datasource: null, expr: null, period: null, times: null,
      labels: null, annotations: null, template: null
    });
    expect(parseAlertRuleDetail({ ...persisted, name: '', expr: '', template: '' }))
      .toMatchObject({ name: '', expr: '', template: '' });
  });

  it('preserves absent audit fields separately from authoritative null', () => {
    const withoutAudit: Record<string, unknown> = { ...persisted };
    delete withoutAudit.creator;
    delete withoutAudit.modifier;
    delete withoutAudit.gmtCreate;
    delete withoutAudit.gmtUpdate;
    expect(parseAlertRuleDetail(withoutAudit)).toEqual(withoutAudit);
  });

  it('keeps missing detail distinct from malformed detail', () => {
    expect(() => parseAlertRuleDetail(null)).toThrow(AlertRuleMissingError);
    expect(() => parseAlertRuleDetail({ ...persisted, id: 0 })).toThrow(AlertRuleContractError);
  });

  it.each([
    ['type', { type: 'realtime_trace' }],
    ['datasource', { datasource: 'elasticsearch' }],
    ['period', { period: 0 }],
    ['times', { times: -1 }],
    ['times overflow', { times: 2_147_483_648 }],
    ['labels', { labels: { '': 'value' } }],
    ['annotations', { annotations: { summary: 1 } }],
    ['name', { name: 'x'.repeat(101) }],
    ['expr', { expr: 'x'.repeat(2049) }],
    ['template', { template: 'x'.repeat(2049) }],
    ['audit time', { gmtUpdate: '2026-02-30T09:00:00' }]
  ])('rejects invalid persisted %s evidence', (_field, patch) => {
    expect(() => parseAlertRuleDetail({ ...persisted, ...patch })).toThrow(AlertRuleContractError);
  });

  it('validates Spring page identity, totals, final-page capacity, and unique ids', () => {
    expect(parseAlertRulePage({
      content: [persisted], totalElements: 1, totalPages: 1, number: 0, size: 8, pageable: {}
    }, query)).toEqual({ content: [persisted], totalElements: 1, totalPages: 1, number: 0, size: 8 });
    expect(parseAlertRulePage({
      content: [], totalElements: 1, totalPages: 1, number: 2, size: 8
    }, { ...query, pageIndex: 2 })).toMatchObject({ content: [], totalElements: 1 });
    expect(() => parseAlertRulePage({
      content: [persisted], totalElements: 1, totalPages: 1, number: 2, size: 8
    }, { ...query, pageIndex: 2 })).toThrow(AlertRuleContractError);
    expect(() => parseAlertRulePage({
      content: [], totalElements: 0, totalPages: 0, number: 1, size: 8
    }, query)).toThrow(AlertRuleContractError);
    expect(() => parseAlertRulePage({
      content: [persisted], totalElements: 1, totalPages: 0, number: 0, size: 8
    }, query)).toThrow(AlertRuleContractError);
    expect(() => parseAlertRulePage({
      content: [persisted, persisted], totalElements: 2, totalPages: 1, number: 0, size: 8
    }, query)).toThrow(AlertRuleContractError);
  });

  it('accepts preview records and rejects arrays or primitives masquerading as rows', () => {
    expect(parseAlertRulePreview([{ value: 1, service: 'checkout' }]))
      .toEqual([{ value: 1, service: 'checkout' }]);
    expect(parseAlertRulePreview([])).toEqual([]);
    expect(() => parseAlertRulePreview(null)).toThrow(AlertRuleContractError);
    expect(() => parseAlertRulePreview([[]])).toThrow(AlertRuleContractError);
    expect(() => parseAlertRulePreview([1])).toThrow(AlertRuleContractError);
  });
});
