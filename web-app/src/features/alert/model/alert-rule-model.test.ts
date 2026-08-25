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
  alertRuleFailureKind,
  alertRuleDraftFromDetail,
  AlertRuleMissingError,
  AlertRuleRequestFailure,
  alertRuleWriteOutcome,
  buildAlertRuleStrategyPatch,
  buildAlertRulePayload,
  buildMetricAlertApplicationPatch,
  buildMetricAlertAuthoringModePatch,
  buildMetricAlertTargetPatch,
  createAlertRuleDraft,
  firstSupportedPeriodicDataType,
  isAlertRuleStrategySupported,
  periodicLogStarterExpression,
  readAlertRuleQuery,
  validateAlertRuleDraft,
  writeAlertRuleQuery,
  type AlertRule
} from './alert-rule-model';

const persisted: AlertRule = {
  id: 7,
  name: 'Slow checkout',
  type: 'periodic_trace',
  datasource: 'sql',
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

describe('alert rule model', () => {
  it('normalizes and serializes the URL-owned query contract', () => {
    expect(readAlertRuleQuery(new URLSearchParams('search=%20cpu%20&pageIndex=-1&pageSize=99'))).toEqual({
      search: 'cpu',
      pageIndex: 0,
      pageSize: 8
    });
    expect(writeAlertRuleQuery({ search: 'cpu', pageIndex: 2, pageSize: 15 }).toString()).toBe(
      'pageIndex=2&pageSize=15&search=cpu'
    );
  });

  it('builds a small, explicit alert payload', () => {
    const draft = {
      ...createAlertRuleDraft(),
      name: 'CPU high',
      expr: 'cpu_usage > 90',
      template: 'CPU usage is high',
      labelsText: 'team:ops, severity:critical'
    };
    expect(buildAlertRulePayload(draft)).toEqual({
      name: 'CPU high',
      type: 'realtime_metric',
      datasource: 'promql',
      expr: 'cpu_usage > 90',
      template: 'CPU usage is high',
      labels: { team: 'ops', severity: 'critical' },
      annotations: {},
      enable: true,
      period: 300,
      times: 3
    });
  });

  it('allowlists persisted detail and preserves hidden annotations through edit payloads', () => {
    const draft = alertRuleDraftFromDetail(persisted);
    expect(draft.annotations).toEqual({ summary: 'Checkout is slow' });
    expect(buildAlertRulePayload({ ...draft, name: ' Updated ' })).toMatchObject({
      id: 7,
      name: 'Updated',
      annotations: { summary: 'Checkout is slow' }
    });
  });

  it('round-trips label keys and values that contain draft separators', () => {
    const labels = {
      'routing:key': 'api,v2',
      matcher: 'status:5xx',
      path: String.raw`edge\primary`
    };
    const draft = alertRuleDraftFromDetail({ ...persisted, labels });

    expect(buildAlertRulePayload(draft).labels).toEqual(labels);
  });

  it('maps persisted strategy types without adding metric editor state to non-realtime-metric drafts', () => {
    const periodic = alertRuleDraftFromDetail({ ...persisted, type: 'periodic_trace', datasource: 'sql' });

    expect(periodic).toMatchObject({ kind: 'periodic', dataType: 'trace' });
    expect(Object.hasOwn(periodic, 'metricEditor')).toBe(false);
  });

  it('preserves Java-nullable thresholds and text through an unrelated realtime edit', () => {
    const nullable: AlertRule = {
      ...persisted,
      type: 'realtime_log',
      datasource: 'promql',
      expr: null,
      template: null,
      period: null,
      times: null,
      labels: null,
      annotations: null
    };
    expect(nullable).toMatchObject({
      expr: null,
      template: null,
      period: null,
      times: null,
      labels: null,
      annotations: null
    });
    const draft = alertRuleDraftFromDetail(nullable);
    expect(draft).toMatchObject({ expr: '', template: '', period: null, times: null });
    expect(buildAlertRulePayload({ ...draft, name: 'Renamed' })).toMatchObject({
      name: 'Renamed',
      type: 'realtime_log',
      datasource: 'promql',
      expr: null,
      template: null,
      period: null,
      times: null,
      labels: null,
      annotations: null
    });
  });

  it('keeps a nullable legacy strategy nullable until the user changes the visible strategy', () => {
    const nullable: AlertRule = { ...persisted, type: null, datasource: null };
    const draft = alertRuleDraftFromDetail(nullable);
    expect(buildAlertRulePayload({ ...draft, name: 'Renamed' })).toMatchObject({ type: null, datasource: null });
    expect(buildAlertRulePayload({ ...draft, kind: 'periodic', name: 'Changed' })).toMatchObject({
      type: 'periodic_metric',
      datasource: 'promql'
    });
  });

  it('requires strict writable labels and supported strategy combinations', () => {
    expect(
      validateAlertRuleDraft({
        ...createAlertRuleDraft(),
        name: 'Rule',
        expr: 'value > 1',
        template: 'Alert',
        labelsText: 'broken'
      })
    ).toContain('labels');
    expect(() =>
      buildAlertRulePayload({
        ...createAlertRuleDraft(),
        name: 'Rule',
        expr: 'value > 1',
        template: 'Alert',
        kind: 'realtime',
        dataType: 'trace'
      })
    ).toThrow(AlertRuleContractError);
  });

  it('starts new authoring without inventing a severity and requires every source-required field', () => {
    const draft = createAlertRuleDraft();

    expect(draft.labelsText).toBe('');
    expect(validateAlertRuleDraft(draft)).toEqual(['name', 'expr', 'template', 'severity']);
  });

  it('enforces the source 200-character message-template write limit', () => {
    const draft = {
      ...createAlertRuleDraft(),
      name: 'Complete rule',
      expr: 'value > 1',
      labelsText: 'severity:warning'
    };

    expect(validateAlertRuleDraft({ ...draft, template: 'x'.repeat(200) })).not.toContain('template');
    expect(validateAlertRuleDraft({ ...draft, template: 'x'.repeat(201) })).toContain('template');
  });

  it('enforces the source 200-character realtime-log expression write limit', () => {
    const draft = {
      ...createAlertRuleDraft(),
      name: 'Complete log rule',
      kind: 'realtime' as const,
      dataType: 'log' as const,
      template: 'Log alert',
      labelsText: 'severity:warning, alert_mode:group'
    };

    expect(validateAlertRuleDraft({ ...draft, expr: 'x'.repeat(200) })).not.toContain('expr');
    expect(validateAlertRuleDraft({ ...draft, expr: 'x'.repeat(201) })).toContain('expr');
  });

  it('enforces the source 100-character periodic PromQL write limit', () => {
    const draft = {
      ...createAlertRuleDraft(),
      name: 'Complete periodic rule',
      kind: 'periodic' as const,
      dataType: 'metric' as const,
      template: 'Alert',
      labelsText: 'severity:warning'
    };

    expect(validateAlertRuleDraft({ ...draft, expr: 'x'.repeat(100) })).not.toContain('expr');
    expect(validateAlertRuleDraft({ ...draft, expr: 'x'.repeat(101) })).toContain('expr');
  });

  it('keeps the selected metric context visible but rejects an empty threshold', () => {
    const initial = {
      ...createAlertRuleDraft(),
      name: 'CPU high',
      template: 'CPU usage is high',
      labelsText: 'severity:warning'
    };
    const withApplication = { ...initial, ...buildMetricAlertApplicationPatch(initial, 'linux_script') };
    const withTarget = {
      ...withApplication,
      ...buildMetricAlertTargetPatch(withApplication, { kind: 'metric', app: 'linux_script', metric: 'cpu' })
    };
    const expert = { ...withTarget, ...buildMetricAlertAuthoringModePatch(withTarget, 'expert', []) };

    expect(validateAlertRuleDraft(withTarget)).toContain('expr');
    expect(expert.expr).toBe('equals(__app__,"linux_script") && equals(__metrics__,"cpu")');
    expect(validateAlertRuleDraft(expert)).toContain('expr');
  });

  it.each([
    ['realtime', 'metric', null],
    ['realtime', 'log', null],
    ['periodic', 'metric', 300],
    ['periodic', 'log', 300],
    ['periodic', 'trace', 300]
  ] as const)('accepts the complete %s %s required-field combination', (kind, dataType, period) => {
    expect(
      validateAlertRuleDraft({
        ...createAlertRuleDraft(),
        name: 'Complete rule',
        kind,
        dataType,
        expr: 'value > 1',
        template: 'Alert',
        labelsText: dataType === 'log' ? 'severity:warning, alert_mode:group' : 'severity:warning',
        period,
        times: null
      })
    ).toEqual([]);
  });

  it('reports every invalid required field in stable write-contract order', () => {
    expect(
      validateAlertRuleDraft({
        ...createAlertRuleDraft(),
        name: ' ',
        kind: 'realtime',
        dataType: 'trace',
        expr: '',
        template: '',
        labelsText: 'broken',
        annotations: { ' ': 'invalid' },
        period: 0,
        times: 0
      })
    ).toEqual(['name', 'type', 'expr', 'template', 'labels', 'severity', 'annotations', 'period', 'times']);
  });

  it('maps periodic signal choices to the executor that can evaluate them', () => {
    const promqlOnly = { hasPromqlExecutor: true, hasSqlExecutor: false };
    const sqlOnly = { hasPromqlExecutor: false, hasSqlExecutor: true };
    const none = { hasPromqlExecutor: false, hasSqlExecutor: false };

    expect(isAlertRuleStrategySupported(promqlOnly, 'periodic', 'metric')).toBe(true);
    expect(isAlertRuleStrategySupported(promqlOnly, 'periodic', 'log')).toBe(false);
    expect(isAlertRuleStrategySupported(sqlOnly, 'periodic', 'log')).toBe(true);
    expect(isAlertRuleStrategySupported(sqlOnly, 'periodic', 'trace')).toBe(true);
    expect(isAlertRuleStrategySupported(none, 'realtime', 'metric')).toBe(true);
    expect(firstSupportedPeriodicDataType(promqlOnly)).toBe('metric');
    expect(firstSupportedPeriodicDataType(sqlOnly)).toBe('log');
    expect(firstSupportedPeriodicDataType(none)).toBeNull();
  });

  it('retires incompatible expressions when the evaluation grammar changes', () => {
    const draft = { ...createAlertRuleDraft(), expr: 'usage > 90', period: null };

    const periodicPatch = buildAlertRuleStrategyPatch(draft, 'periodic', 'log');
    expect(periodicPatch).toStrictEqual({
      kind: 'periodic',
      dataType: 'log',
      expr: periodicLogStarterExpression,
      period: 300,
      labelsText: '',
      strategyChanged: true
    });
    expect(periodicPatch).not.toHaveProperty('metricEditor');
    expect(buildAlertRuleStrategyPatch({ ...draft, kind: 'periodic', dataType: 'log' }, 'periodic', 'trace')).toEqual({
      kind: 'periodic',
      dataType: 'trace',
      expr: '',
      period: 300,
      labelsText: '',
      strategyChanged: true
    });

    expect(buildAlertRuleStrategyPatch({ ...draft, kind: 'periodic' }, 'realtime', 'metric')).toMatchObject({
      metricEditor: {
        kind: 'targeted',
        app: '',
        target: null
      }
    });
  });

  it('preserves the source authoring mode while realtime data types change', () => {
    const metric = {
      ...createAlertRuleDraft(),
      authoringMode: 'expert' as const,
      metricEditor: {
        kind: 'targeted' as const,
        app: 'hertzbeat',
        target: { kind: 'metric' as const, app: 'hertzbeat', metric: 'summary' },
        monitorIds: [],
        monitorLabels: [],
        authoring: { mode: 'expert' as const, condition: 'responseTime > 100' }
      }
    };

    const log = { ...metric, ...buildAlertRuleStrategyPatch(metric, 'realtime', 'log') };
    const metricAgain = { ...log, ...buildAlertRuleStrategyPatch(log, 'realtime', 'metric') };

    expect(log.authoringMode).toBe('expert');
    expect(metricAgain.authoringMode).toBe('expert');
    expect(metricAgain.metricEditor).toMatchObject({
      kind: 'targeted',
      authoring: { mode: 'expert', condition: '' }
    });
  });

  it('preserves explicit reserved labels across strategy changes without selecting missing values', () => {
    const blank = createAlertRuleDraft();
    expect(buildAlertRuleStrategyPatch(blank, 'realtime', 'log')).toMatchObject({ labelsText: '' });

    const selected = { ...blank, labelsText: 'severity:critical, alert_mode:individual' };
    expect(buildAlertRuleStrategyPatch(selected, 'periodic', 'log')).toMatchObject({
      labelsText: 'severity:critical, alert_mode:individual'
    });
    expect(buildAlertRuleStrategyPatch(selected, 'periodic', 'metric')).toMatchObject({
      labelsText: 'severity:critical'
    });
  });

  it('does not revive nullable persisted expression evidence after a strategy change', () => {
    const nullable = alertRuleDraftFromDetail({
      ...persisted,
      type: null,
      datasource: null,
      expr: null
    });
    const changed = {
      ...nullable,
      ...buildAlertRuleStrategyPatch(nullable, 'periodic', 'metric')
    };
    const changedBack = {
      ...changed,
      ...buildAlertRuleStrategyPatch(changed, 'realtime', 'metric')
    };

    expect(validateAlertRuleDraft(changed)).toContain('expr');
    expect(validateAlertRuleDraft(changedBack)).toContain('expr');
    expect(() => buildAlertRulePayload(changedBack)).toThrow(AlertRuleContractError);
  });

  it('classifies stable read failures without transport evidence', () => {
    expect(alertRuleFailureKind(new AlertRuleMissingError())).toBe('missing');
    expect(alertRuleFailureKind(new AlertRuleRequestFailure('unavailable', 'uncertain'))).toBe('unavailable');
    expect(alertRuleFailureKind(new AlertRuleRequestFailure('error', 'rejected'))).toBe('error');
    expect(alertRuleFailureKind(new AlertRuleContractError('invalid contract'))).toBe('error');
    expect(alertRuleFailureKind(new Error('unknown failure'))).toBe('error');
  });

  it('treats only contract and explicit request rejection as definite', () => {
    expect(alertRuleWriteOutcome(new AlertRuleContractError('invalid command'))).toBe('rejected');
    expect(alertRuleWriteOutcome(new AlertRuleRequestFailure('error', 'rejected'))).toBe('rejected');
    expect(alertRuleWriteOutcome(new AlertRuleRequestFailure('missing', 'uncertain'))).toBe('uncertain');
    expect(alertRuleWriteOutcome(new Error('unknown failure'))).toBe('uncertain');
  });
});
