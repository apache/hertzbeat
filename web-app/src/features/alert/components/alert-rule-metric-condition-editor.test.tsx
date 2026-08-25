/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAlertRuleDraft, type AlertRuleDraft, type MetricAlertField } from '../model/alert-rule-model';
import editorStyles from '../shared/alert-rule-editor.module.css?raw';
import { AlertRuleMetricConditionEditor } from './alert-rule-metric-condition-editor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

type ConditionEditorActions = Pick<
  Parameters<typeof AlertRuleMetricConditionEditor>[0],
  'changeStructured' | 'changeExpert' | 'changeMode'
>;

const fields: MetricAlertField[] = [
  { value: 'responseTime', label: 'Response time', type: 0, unit: 'ms' },
  { value: 'status', label: 'Status', type: 1, unit: null }
];

describe('Alert Rule metric condition editor', () => {
  afterEach(cleanup);

  it('adds structured conditions and nested groups through typed transitions', () => {
    const changeStructured = vi.fn<ConditionEditorActions['changeStructured']>();
    renderEditor(structuredDraft(), { changeStructured });

    fireEvent.click(screen.getByRole('radio', { name: 'alertRules.metricCondition.or' }));
    expect(changeStructured).toHaveBeenCalledWith({ kind: 'group', join: 'or', items: [] });

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricCondition.addCondition' }));
    expect(changeStructured).toHaveBeenCalledWith({
      kind: 'group',
      join: 'and',
      items: [{ kind: 'condition', field: 'responseTime', operator: '>', value: null }]
    });

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricCondition.addGroup' }));
    expect(changeStructured).toHaveBeenLastCalledWith({
      kind: 'group',
      join: 'and',
      items: [
        {
          kind: 'group',
          join: 'and',
          items: []
        }
      ]
    });
    expect(screen.getByRole('radio', { name: 'alertRules.metricCondition.expert' })).toBeEnabled();
  });

  it('matches the source radio mode row and keeps an empty root builder visually quiet', () => {
    renderEditor(structuredDraft(), {});

    expect(screen.getByRole('radiogroup', { name: 'alertRules.metricCondition.rule' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'alertRules.metricCondition.structured' })).toBeChecked();
    expect(screen.queryByText('alertRules.metricCondition.empty')).toBeNull();
    expect(screen.getByText('alertRules.metricCondition.ruleButton')).toBeInTheDocument();
    expect(screen.getByText('alertRules.metricCondition.rulesetButton')).toBeInTheDocument();
  });

  it('keeps expression authoring inside the standard field control column', () => {
    renderEditor(structuredDraft(), {});

    expect(screen.getByRole('region', { name: 'alertRules.metricCondition.title' })).not.toHaveClass('wide');
    expect(editorStyles).toMatch(
      /\.fieldRow,\s*\.conditionModeRow,\s*\.conditionAuthoringRow,\s*\.metricAvailabilityRow,\s*\.metricSection > label\s*\{[^}]*grid-template-columns:\s*minmax\(150px, 7fr\) minmax\(0, 12fr\) minmax\(80px, 5fr\);/s
    );
    expect(editorStyles).toMatch(/\.conditionModeControl,\s*\.conditionAuthoringControl\s*\{[^}]*grid-column:\s*2;/s);
    expect(editorStyles).toMatch(/\.conditionGroupHeader\s*\{[^}]*justify-content:\s*space-between;/s);
    expect(editorStyles).toMatch(/\.conditionNested\s*\{[^}]*padding-left:\s*48px;/s);
    expect(editorStyles).toMatch(/\.conditionGroup > \.conditionRow\s*\{[^}]*margin-left:\s*48px;/s);
    expect(editorStyles).toMatch(
      /\.conditionRow\s*\{[^}]*grid-template-columns:\s*minmax\(80px, 0\.7fr\) minmax\(56px, 0\.5fr\) minmax\(160px, 1\.5fr\) 32px;/s
    );
  });

  it('uses the source value placeholders for numeric and string rules', () => {
    renderEditor(
      targetedDraft({
        mode: 'structured',
        condition: {
          kind: 'group',
          join: 'and',
          items: [
            { kind: 'condition', field: 'responseTime', operator: '>', value: null },
            { kind: 'condition', field: 'status', operator: 'equals', value: '' }
          ]
        }
      }),
      {}
    );

    expect(screen.getByRole('spinbutton', { name: 'alertRules.metricCondition.value' })).toHaveAttribute(
      'placeholder',
      'alertRules.metricCondition.numberPlaceholder'
    );
    expect(screen.getByRole('textbox', { name: 'alertRules.metricCondition.value' })).toHaveAttribute(
      'placeholder',
      'alertRules.metricCondition.stringPlaceholder'
    );
  });

  it('edits only the threshold in expert mode and offers safe structured recovery', () => {
    const changeExpert = vi.fn<ConditionEditorActions['changeExpert']>();
    const changeMode = vi.fn<ConditionEditorActions['changeMode']>();
    renderEditor(expertDraft('responseTime > 100'), { changeExpert, changeMode });

    expect(screen.queryByText('alertRules.metricCondition.expertExpression')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'alertRules.metricCondition.expertExpression' }), {
      target: { value: 'responseTime > 200' }
    });
    expect(changeExpert).toHaveBeenCalledWith('responseTime > 200');
    fireEvent.click(screen.getByRole('radio', { name: 'alertRules.metricCondition.structured' }));
    expect(changeMode).toHaveBeenCalledWith('structured');
  });

  it('enters expression authoring before a guided condition exists', () => {
    const changeMode = vi.fn<ConditionEditorActions['changeMode']>();
    renderEditor(structuredDraft(), { changeMode });

    fireEvent.click(screen.getByRole('radio', { name: 'alertRules.metricCondition.expert' }));

    expect(changeMode).toHaveBeenCalledWith('expert');
  });

  it('matches the legacy expression editor controls and inserts fields at the cursor', async () => {
    const changeExpert = vi.fn<ConditionEditorActions['changeExpert']>();
    renderEditor(expertDraft('responseTime 100'), { changeExpert });
    const textarea = screen.getByRole('textbox', { name: 'alertRules.metricCondition.expertExpression' });
    expect(textarea).toHaveAttribute('rows', '3');
    expect(textarea).toHaveAttribute('maxlength', '100');
    expect(textarea).toHaveAttribute('placeholder', 'alertRules.metricCondition.expressionPlaceholder');

    (textarea as HTMLTextAreaElement).setSelectionRange(13, 13);
    const insertButton = screen.getByRole('button', { name: 'alertRules.metricCondition.insertExpression' });
    fireEvent.mouseDown(insertButton);
    fireEvent.click(insertButton);
    await waitFor(() => expect(screen.getByText('Response time')).toBeInTheDocument());
    fireEvent.click(screen.getByText('alertRules.metricCondition.operators.>'));

    expect(changeExpert).toHaveBeenCalledWith('responseTime > 100');
  });

  it('requests structured recovery while leaving unsupported parsing to the model contract', () => {
    const changeMode = vi.fn<ConditionEditorActions['changeMode']>();
    renderEditor(expertDraft('custom(value)'), { changeMode });
    expect(screen.getByRole('radio', { name: 'alertRules.metricCondition.structured' })).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: 'alertRules.metricCondition.structured' }));
    expect(changeMode).toHaveBeenCalledWith('structured');
  });
});

function renderEditor(draft: AlertRuleDraft, actions: Partial<ConditionEditorActions>) {
  render(
    <AlertRuleMetricConditionEditor
      busy={false}
      draft={draft}
      fields={fields}
      changeStructured={actions.changeStructured ?? vi.fn<ConditionEditorActions['changeStructured']>()}
      changeExpert={actions.changeExpert ?? vi.fn<ConditionEditorActions['changeExpert']>()}
      changeMode={actions.changeMode ?? vi.fn<ConditionEditorActions['changeMode']>()}
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
