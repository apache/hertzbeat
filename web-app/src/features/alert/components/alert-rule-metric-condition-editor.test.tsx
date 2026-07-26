/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAlertRuleDraft, type AlertRuleDraft, type MetricAlertField } from '../model/alert-rule-model';
import { AlertRuleMetricConditionEditor } from './alert-rule-metric-condition-editor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const fields: MetricAlertField[] = [
  { value: 'responseTime', label: 'Response time', type: 0, unit: 'ms' },
  { value: 'status', label: 'Status', type: 1, unit: null }
];

describe('Alert Rule metric condition editor', () => {
  afterEach(cleanup);

  it('adds structured conditions and nested groups through typed transitions', () => {
    const changeStructured = vi.fn();
    renderEditor(structuredDraft(), { changeStructured });

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricCondition.addCondition' }));
    expect(changeStructured).toHaveBeenCalledWith({
      kind: 'group',
      join: 'and',
      items: [{ kind: 'condition', field: 'responseTime', operator: '>', value: 0 }]
    });

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricCondition.addGroup' }));
    expect(changeStructured).toHaveBeenLastCalledWith({
      kind: 'group',
      join: 'and',
      items: [
        {
          kind: 'group',
          join: 'and',
          items: [{ kind: 'condition', field: 'responseTime', operator: '>', value: 0 }]
        }
      ]
    });
    expect(screen.getByRole('button', { name: 'alertRules.metricCondition.expert' })).toBeDisabled();
  });

  it('edits only the threshold in expert mode and offers safe structured recovery', () => {
    const changeExpert = vi.fn();
    const changeMode = vi.fn();
    renderEditor(expertDraft('responseTime > 100'), { changeExpert, changeMode });

    fireEvent.change(screen.getByRole('textbox', { name: 'alertRules.metricCondition.expertExpression' }), {
      target: { value: 'responseTime > 200' }
    });
    expect(changeExpert).toHaveBeenCalledWith('responseTime > 200');
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricCondition.structured' }));
    expect(changeMode).toHaveBeenCalledWith('structured');
  });

  it('keeps structured recovery disabled for an unsupported expert threshold', () => {
    renderEditor(expertDraft('custom(value)'), {});
    expect(screen.getByRole('button', { name: 'alertRules.metricCondition.structured' })).toBeDisabled();
    expect(screen.getByText('alertRules.metricCondition.expertOnly')).toBeInTheDocument();
  });
});

function renderEditor(
  draft: AlertRuleDraft,
  actions: {
    changeStructured?: ReturnType<typeof vi.fn>;
    changeExpert?: ReturnType<typeof vi.fn>;
    changeMode?: ReturnType<typeof vi.fn>;
  }
) {
  render(
    <AlertRuleMetricConditionEditor
      busy={false}
      draft={draft}
      fields={fields}
      changeStructured={actions.changeStructured ?? vi.fn()}
      changeExpert={actions.changeExpert ?? vi.fn()}
      changeMode={actions.changeMode ?? vi.fn()}
    />
  );
}

function structuredDraft(): AlertRuleDraft {
  return targetedDraft({
    mode: 'structured',
    condition: { kind: 'group', join: 'and', items: [] }
  });
}

function expertDraft(condition: string): AlertRuleDraft {
  return targetedDraft({ mode: 'expert', condition });
}

function targetedDraft(
  authoring: Extract<NonNullable<AlertRuleDraft['metricEditor']>, { kind: 'targeted' }>['authoring']
): AlertRuleDraft {
  return {
    ...createAlertRuleDraft(),
    metricEditor: {
      kind: 'targeted',
      app: 'springboot3',
      target: { kind: 'metric', app: 'springboot3', metric: 'summary' },
      monitorIds: [],
      monitorLabels: [],
      authoring
    }
  };
}
