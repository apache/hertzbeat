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
  alertRuleDraftFromDetail,
  buildAlertRulePayload,
  createAlertRuleDraft,
  readAlertRuleQuery,
  validateAlertRuleDraft,
  writeAlertRuleQuery,
  type AlertRule
} from './alert-rule-model';

const persisted: AlertRule = {
  id: 7, name: 'Slow checkout', type: 'periodic_trace', datasource: 'sql',
  expr: 'SELECT duration AS __value__ FROM spans', period: 300, times: 2,
  labels: { team: 'platform' }, annotations: { summary: 'Checkout is slow' },
  template: 'Checkout latency {{ $value }}', enable: true,
  creator: 'operator', modifier: null, gmtCreate: '2026-07-17T09:00:00', gmtUpdate: null
};

describe('alert rule model', () => {
  it('normalizes and serializes the URL-owned query contract', () => {
    expect(readAlertRuleQuery(new URLSearchParams('search=%20cpu%20&pageIndex=-1&pageSize=99')))
      .toEqual({ search: 'cpu', pageIndex: 0, pageSize: 8 });
    expect(writeAlertRuleQuery({ search: 'cpu', pageIndex: 2, pageSize: 15 }).toString())
      .toBe('pageIndex=2&pageSize=15&search=cpu');
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
    const draft = alertRuleDraftFromDetail(persisted);
    expect(draft.annotations).toEqual({ summary: 'Checkout is slow' });
    expect(buildAlertRulePayload({ ...draft, name: ' Updated ' })).toMatchObject({
      id: 7, name: 'Updated', annotations: { summary: 'Checkout is slow' }
    });
  });

  it('preserves Java-nullable thresholds and text through an unrelated realtime edit', () => {
    const nullable: AlertRule = {
      ...persisted, type: 'realtime_log', datasource: 'promql', expr: null, template: null,
      period: null, times: null, labels: null, annotations: null
    };
    expect(nullable).toMatchObject({ expr: null, template: null, period: null, times: null, labels: null, annotations: null });
    const draft = alertRuleDraftFromDetail(nullable);
    expect(draft).toMatchObject({ expr: '', template: '', period: null, times: null });
    expect(buildAlertRulePayload({ ...draft, name: 'Renamed' })).toMatchObject({
      name: 'Renamed', type: 'realtime_log', datasource: 'promql', expr: null, template: null,
      period: null, times: null, labels: null, annotations: null
    });
  });

  it('keeps a nullable legacy strategy nullable until the user changes the visible strategy', () => {
    const nullable: AlertRule = { ...persisted, type: null, datasource: null };
    const draft = alertRuleDraftFromDetail(nullable);
    expect(buildAlertRulePayload({ ...draft, name: 'Renamed' })).toMatchObject({ type: null, datasource: null });
    expect(buildAlertRulePayload({ ...draft, kind: 'periodic', name: 'Changed' })).toMatchObject({
      type: 'periodic_metric', datasource: 'promql'
    });
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
