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
  AlertRuleContractError,
  AlertRuleMissingError,
  alertRuleDraftFromDetail,
  buildAlertRuleListPath,
  buildAlertRulePayload,
  createAlertRuleDraft,
  parseAlertRuleDetail,
  parseAlertRulePage,
  validateAlertRuleDraft,
  type AlertRuleQuery
} from './alert-rule-model';

const query: AlertRuleQuery = { search: '', pageIndex: 0, pageSize: 8 };
const persisted = {
  id: 7, name: 'Slow checkout', type: 'periodic_trace', datasource: 'sql',
  expr: 'SELECT duration AS __value__ FROM spans', period: 300, times: 2,
  labels: { team: 'platform' }, annotations: { summary: 'Checkout is slow' },
  template: 'Checkout latency {{ $value }}', enable: true,
  creator: 'operator', modifier: null, gmtCreate: '2026-07-17T09:00:00', gmtUpdate: null
};

describe('alert rule model', () => {
  it('builds the established paged search contract', () => {
    expect(buildAlertRuleListPath({ search: '', pageIndex: 0, pageSize: 8 }))
      .toBe('/api/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(buildAlertRuleListPath({ search: 'cpu', pageIndex: 2, pageSize: 15 }))
      .toBe('/api/alert/defines?pageIndex=2&pageSize=15&sort=id&order=desc&search=%255B%2522cpu%2522%255D');
  });

  it('builds a small, explicit alert payload', () => {
    const draft = { ...createAlertRuleDraft(), name: 'CPU high', expr: 'cpu_usage > 90', template: 'CPU usage is high', labelsText: 'team:ops, severity:critical' };
    expect(buildAlertRulePayload(draft)).toEqual({
      name: 'CPU high', type: 'realtime_metric', datasource: 'promql', expr: 'cpu_usage > 90',
      template: 'CPU usage is high', labels: { team: 'ops', severity: 'critical' }, annotations: {},
      enable: true, period: 300, times: 3
    });
  });

  it('allowlists persisted detail and preserves hidden annotations through edit payloads', () => {
    const parsed = parseAlertRuleDetail({ ...persisted, serverOnly: 'discard' });
    expect(parsed).toEqual(persisted);
    const draft = alertRuleDraftFromDetail(parsed);
    expect(draft.annotations).toEqual({ summary: 'Checkout is slow' });
    expect(buildAlertRulePayload({ ...draft, name: ' Updated ' })).toMatchObject({
      id: 7, name: 'Updated', annotations: { summary: 'Checkout is slow' }
    });
  });

  it('distinguishes missing detail from malformed detail', () => {
    expect(() => parseAlertRuleDetail(null)).toThrow(AlertRuleMissingError);
    expect(() => parseAlertRuleDetail({ ...persisted, id: 0 })).toThrow(AlertRuleContractError);
  });

  it('preserves Java-nullable thresholds and text through an unrelated realtime edit', () => {
    const nullable = parseAlertRuleDetail({
      ...persisted, type: 'realtime_log', datasource: 'promql', expr: null, template: null,
      period: null, times: null, labels: null, annotations: null
    });
    expect(nullable).toMatchObject({ expr: null, template: null, period: null, times: null, labels: null, annotations: null });
    const draft = alertRuleDraftFromDetail(nullable);
    expect(draft).toMatchObject({ expr: '', template: '', period: null, times: null });
    expect(buildAlertRulePayload({ ...draft, name: 'Renamed' })).toMatchObject({
      name: 'Renamed', type: 'realtime_log', datasource: 'promql', expr: null, template: null,
      period: null, times: null, labels: null, annotations: null
    });
  });

  it('accepts entity-valid empty persisted text without treating it as missing evidence', () => {
    expect(parseAlertRuleDetail({ ...persisted, name: '', expr: '', template: '' }))
      .toMatchObject({ name: '', expr: '', template: '' });
  });

  it('keeps a nullable legacy strategy nullable until the user changes the visible strategy', () => {
    const nullable = parseAlertRuleDetail({ ...persisted, type: null, datasource: null });
    const draft = alertRuleDraftFromDetail(nullable);
    expect(buildAlertRulePayload({ ...draft, name: 'Renamed' })).toMatchObject({ type: null, datasource: null });
    expect(buildAlertRulePayload({ ...draft, kind: 'periodic', name: 'Changed' })).toMatchObject({
      type: 'periodic_metric', datasource: 'promql'
    });
  });

  it.each([
    ['type', { type: 'realtime_trace' }],
    ['datasource', { datasource: 'elasticsearch' }],
    ['period', { period: 0 }],
    ['times', { times: -1 }],
    ['times-overflow', { times: 2_147_483_648 }],
    ['labels', { labels: { '': 'value' } }],
    ['annotations', { annotations: { summary: 1 } }],
    ['name', { name: 'x'.repeat(101) }],
    ['expr', { expr: 'x'.repeat(2049) }],
    ['template', { template: 'x'.repeat(2049) }],
    ['gmtUpdate', { gmtUpdate: '2026-02-30T09:00:00' }]
  ])('rejects invalid persisted %s domain evidence', (_field, patch) => {
    expect(() => parseAlertRuleDetail({ ...persisted, ...patch })).toThrow(AlertRuleContractError);
  });

  it('binds Spring page evidence to the request and strips transport fields', () => {
    expect(parseAlertRulePage({ content: [persisted], totalElements: 1, totalPages: 1, number: 0, size: 8, pageable: {} }, query))
      .toEqual({ content: [persisted], totalElements: 1, totalPages: 1, number: 0, size: 8 });
    expect(() => parseAlertRulePage({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 8 }, query))
      .toThrow(AlertRuleContractError);
    expect(() => parseAlertRulePage({ content: [persisted, persisted], totalElements: 2, totalPages: 1, number: 0, size: 8 }, query))
      .toThrow(AlertRuleContractError);
  });

  it('rejects impossible page content but permits truthful out-of-range empty pages', () => {
    expect(() => parseAlertRulePage({ content: [persisted], totalElements: 1, totalPages: 1, number: 2, size: 8 }, { ...query, pageIndex: 2 }))
      .toThrow(AlertRuleContractError);
    expect(parseAlertRulePage({ content: [], totalElements: 1, totalPages: 1, number: 2, size: 8 }, { ...query, pageIndex: 2 }))
      .toMatchObject({ content: [], totalElements: 1 });
  });

  it('requires strict writable labels and supported strategy combinations', () => {
    expect(validateAlertRuleDraft({ ...createAlertRuleDraft(), name: 'Rule', expr: 'value > 1', template: 'Alert', labelsText: 'broken' }))
      .toContain('labels');
    expect(() => buildAlertRulePayload({ ...createAlertRuleDraft(), name: 'Rule', expr: 'value > 1', template: 'Alert', kind: 'realtime', dataType: 'trace' }))
      .toThrow(AlertRuleContractError);
  });

  it('requires name, expression, and message template', () => {
    expect(validateAlertRuleDraft(createAlertRuleDraft())).toEqual(['name', 'expr', 'template']);
  });
});
