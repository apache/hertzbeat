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
  buildMetricAlertAuthoringModePatch,
  buildMetricAlertBindingsPatch,
  buildMetricAlertExpertConditionPatch,
  buildMetricAlertStructuredConditionPatch,
  buildMetricAlertTargetPatch,
  createAlertRuleDraft,
  recoverMetricAlertStructuredAuthoring,
  synchronizeMetricAlertDraftPatch,
  type AlertRule,
  type AlertRuleDraft,
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
        '  responseTime > 200  '
      )
    ).toMatchObject({
      expr: 'equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 200',
      metricEditor: { authoring: { mode: 'expert', condition: '  responseTime > 200  ' } }
    });
    expect(recoverMetricAlertStructuredAuthoring(alertRuleDraftFromDetail(rule('custom(value)')), fields)).toEqual({});
  });

  it('switches authoring modes only when the threshold can be represented without reinterpretation', () => {
    const draft = alertRuleDraftFromDetail(
      rule('equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 100')
    );
    const structured = { ...draft, ...buildMetricAlertAuthoringModePatch(draft, 'structured', fields) };
    expect(structured.metricEditor).toMatchObject({
      authoring: { mode: 'structured', condition: { items: [{ field: 'responseTime', value: 100 }] } }
    });
    expect(buildMetricAlertAuthoringModePatch(structured, 'expert', fields)).toMatchObject({
      expr: draft.expr,
      metricEditor: { authoring: { mode: 'expert', condition: 'responseTime > 100' } }
    });
    const incomplete = {
      ...structured,
      metricEditor: {
        ...targetedMetricEditor(structured),
        authoring: {
          mode: 'structured' as const,
          condition: { kind: 'group' as const, join: 'and' as const, items: [] }
        }
      }
    };
    expect(buildMetricAlertAuthoringModePatch(incomplete, 'expert', fields)).toEqual({});

    const unknown = alertRuleDraftFromDetail(
      rule('equals(__app__,"springboot3") && equals(__metrics__,"summary") && custom(value)')
    );
    expect(buildMetricAlertAuthoringModePatch(unknown, 'structured', fields)).toEqual({});
  });

  it('keeps an incomplete structured threshold transient and clears the writable expression', () => {
    const draft = alertRuleDraftFromDetail(
      rule('equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 100')
    );
    const condition = {
      kind: 'group' as const,
      join: 'and' as const,
      items: [{ kind: 'condition' as const, field: 'status', operator: 'equals' as const, value: '' }]
    };

    expect(buildMetricAlertStructuredConditionPatch(draft, condition, fields)).toMatchObject({
      expr: '',
      metricEditor: { authoring: { mode: 'structured', condition } }
    });
  });

  it('composes canonical monitor and label bindings without losing the threshold owner', () => {
    const draft = alertRuleDraftFromDetail(
      rule('equals(__app__,"springboot3") && equals(__metrics__,"summary") && responseTime > 100')
    );

    expect(
      buildMetricAlertBindingsPatch(draft, [9, 7, 9], ['team:ops', ' env:prod ', 'team:ops'], fields)
    ).toMatchObject({
      expr:
        'equals(__app__,"springboot3") && equals(__metrics__,"summary") && ' +
        '(equals(__instance__, "7") or equals(__instance__, "9")) && ' +
        '(contains(__labels__, "env:prod") or contains(__labels__, "team:ops")) && responseTime > 100',
      metricEditor: {
        monitorIds: [7, 9],
        monitorLabels: ['env:prod', 'team:ops'],
        authoring: { mode: 'expert', condition: 'responseTime > 100' }
      }
    });
  });

  it('retains incomplete guided bindings transiently and rejects unsafe identities', () => {
    const appDraft = {
      ...createAlertRuleDraft(),
      ...buildMetricAlertApplicationPatch(createAlertRuleDraft(), 'springboot3')
    };
    const targetDraft = {
      ...appDraft,
      ...buildMetricAlertTargetPatch(appDraft, { kind: 'metric', app: 'springboot3', metric: 'summary' })
    };
    expect(buildMetricAlertBindingsPatch(targetDraft, [7], ['team:ops'], fields)).toMatchObject({
      expr: '',
      metricEditor: { monitorIds: [7], monitorLabels: ['team:ops'], authoring: { mode: 'structured' } }
    });
    expect(() => buildMetricAlertBindingsPatch(targetDraft, [0], [], fields)).toThrow();
    expect(() => buildMetricAlertBindingsPatch(targetDraft, [], ['bad"label'], fields)).toThrow();
  });

  it('composes availability bindings without inventing a threshold', () => {
    const appDraft = {
      ...createAlertRuleDraft(),
      ...buildMetricAlertApplicationPatch(createAlertRuleDraft(), 'springboot3')
    };
    const availabilityDraft = {
      ...appDraft,
      ...buildMetricAlertTargetPatch(appDraft, { kind: 'availability', app: 'springboot3' })
    };

    expect(buildMetricAlertBindingsPatch(availabilityDraft, [7], ['team:ops'], fields)).toMatchObject({
      expr:
        'equals(__app__,"springboot3") && equals(__available__,"down") && ' +
        'equals(__instance__, "7") && contains(__labels__, "team:ops")'
    });
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
    if (!draft.metricEditor) throw new Error('expected persisted metric editor');
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

function targetedMetricEditor(draft: AlertRuleDraft) {
  if (draft.metricEditor?.kind !== 'targeted') throw new Error('expected targeted metric editor');
  return draft.metricEditor;
}
