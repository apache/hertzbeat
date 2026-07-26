/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  alertRuleDraftFromDetail,
  buildMetricAlertApplicationPatch,
  buildMetricAlertExpertConditionPatch,
  buildMetricAlertStructuredConditionPatch,
  buildMetricAlertTargetPatch,
  createAlertRuleDraft,
  recoverMetricAlertStructuredAuthoring,
  synchronizeMetricAlertDraftPatch,
  type AlertRule,
  type MetricAlertField
} from './alert-rule-model';

const fields: MetricAlertField[] = [
  { value: 'responseTime', label: 'Response time', type: 0, unit: 'ms' },
  { value: 'status', label: 'Status', type: 1, unit: null }
];

describe('metric alert draft transitions', () => {
  it('starts new realtime metric authoring with one empty guided owner', () => {
    expect(createAlertRuleDraft().metricEditor).toEqual({
      kind: 'targeted',
      app: '',
      target: null,
      monitorIds: [],
      monitorLabels: [],
      authoring: {
        mode: 'structured',
        condition: { kind: 'group', join: 'and', items: [] }
      }
    });
  });

  it('recovers target bindings without pretending an unknown condition is structured', () => {
    const draft = alertRuleDraftFromDetail(
      rule(
        'equals(__app__,"springboot3") && equals(__metrics__,"summary") && ' +
          'equals(__instance__, "7") && contains(__labels__, "team:ops") && custom(value)'
      )
    );

    expect(draft.metricEditor).toEqual({
      kind: 'targeted',
      app: 'springboot3',
      target: { kind: 'metric', app: 'springboot3', metric: 'summary' },
      monitorIds: [7],
      monitorLabels: ['team:ops'],
      authoring: { mode: 'expert', condition: 'custom(value)' }
    });
    expect(alertRuleDraftFromDetail(rule('custom(value)')).metricEditor).toEqual({
      kind: 'unparsed',
      expression: 'custom(value)'
    });
  });

  it('retires incompatible target, binding, and condition state when the application changes', () => {
    const draft = {
      ...createAlertRuleDraft(),
      expr: 'old expression',
      metricEditor: {
        kind: 'targeted' as const,
        app: 'linux',
        target: { kind: 'metric' as const, app: 'linux', metric: 'cpu' },
        monitorIds: [7],
        monitorLabels: ['team:ops'],
        authoring: { mode: 'expert' as const, condition: 'usage > 90' }
      }
    };

    expect(buildMetricAlertApplicationPatch(draft, 'springboot3')).toEqual({
      expr: '',
      metricEditor: {
        kind: 'targeted',
        app: 'springboot3',
        target: null,
        monitorIds: [],
        monitorLabels: [],
        authoring: {
          mode: 'structured',
          condition: { kind: 'group', join: 'and', items: [] }
        }
      }
    });
    expect(buildMetricAlertApplicationPatch(draft, 'linux')).toEqual({});
  });

  it('composes availability immediately and metrics only after a valid condition exists', () => {
    const appDraft = {
      ...createAlertRuleDraft(),
      ...buildMetricAlertApplicationPatch(createAlertRuleDraft(), 'springboot3')
    };
    expect(buildMetricAlertTargetPatch(appDraft, { kind: 'availability', app: 'springboot3' })).toMatchObject({
      expr: 'equals(__app__,"springboot3") && equals(__available__,"down")'
    });

    const targetPatch = buildMetricAlertTargetPatch(appDraft, {
      kind: 'metric',
      app: 'springboot3',
      metric: 'summary'
    });
    const metricDraft = { ...appDraft, ...targetPatch };
    expect(metricDraft.expr).toBe('');
    expect(
      buildMetricAlertStructuredConditionPatch(
        metricDraft,
        {
          kind: 'group',
          join: 'and',
          items: [{ kind: 'condition', field: 'responseTime', operator: '>', value: 100 }]
        },
        fields
      )
    ).toMatchObject({
      expr: 'equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 100'
    });
  });

  it('keeps expert source exact and upgrades it only when the current fields parse safely', () => {
    const draft = alertRuleDraftFromDetail(
      rule('equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 100')
    );
    expect(recoverMetricAlertStructuredAuthoring(draft, fields)).toMatchObject({
      expr: draft.expr,
      metricEditor: {
        kind: 'targeted',
        authoring: {
          mode: 'structured',
          condition: {
            items: [{ field: 'responseTime', operator: '>', value: 100 }]
          }
        }
      }
    });
    expect(
      buildMetricAlertExpertConditionPatch(
        { ...draft, ...recoverMetricAlertStructuredAuthoring(draft, fields) },
        'responseTime > 200'
      )
    ).toMatchObject({
      expr: 'equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 200',
      metricEditor: { authoring: { mode: 'expert', condition: 'responseTime > 200' } }
    });
    expect(recoverMetricAlertStructuredAuthoring(alertRuleDraftFromDetail(rule('custom(value)')), fields)).toEqual({});
  });

  it('keeps the transient owner synchronized when the existing raw textarea changes expression', () => {
    const draft = alertRuleDraftFromDetail(
      rule('equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 100')
    );

    expect(
      synchronizeMetricAlertDraftPatch(draft, {
        expr: 'equals(__app__,"linux") && equals(__metrics__,"cpu") && usage > 90'
      })
    ).toMatchObject({
      metricEditor: {
        kind: 'targeted',
        app: 'linux',
        target: { kind: 'metric', app: 'linux', metric: 'cpu' },
        authoring: { mode: 'expert', condition: 'usage > 90' }
      }
    });
    expect(
      synchronizeMetricAlertDraftPatch(draft, {
        expr: '',
        metricEditor: draft.metricEditor
      }).metricEditor
    ).toBe(draft.metricEditor);
  });
});

function rule(expr: string): AlertRule {
  return {
    id: 7,
    name: 'Rule',
    type: 'realtime_metric',
    datasource: 'promql',
    expr,
    period: null,
    times: 1,
    labels: {},
    annotations: {},
    template: 'Alert',
    enable: true
  };
}
