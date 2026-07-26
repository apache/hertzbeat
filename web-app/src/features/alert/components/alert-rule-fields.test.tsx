/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAlertRuleDraft } from '../model/alert-rule-model';
import { AlertRuleFields } from './alert-rule-fields';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Alert Rule strategy fields', () => {
  afterEach(cleanup);

  it('disables periodic authoring until a periodic executor is available', async () => {
    const actions = renderFields({
      kind: 'ready',
      status: { hasPromqlExecutor: false, hasSqlExecutor: false }
    });

    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]!);
    fireEvent.click(await screen.findByRole('option', { name: 'alertRules.kind.periodic' }));

    expect(actions.changeKind).not.toHaveBeenCalled();
  });

  it('disables a periodic signal unsupported by the available executor', async () => {
    const actions = renderFields(
      {
        kind: 'ready',
        status: { hasPromqlExecutor: false, hasSqlExecutor: true }
      },
      { kind: 'periodic', dataType: 'log' }
    );

    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]!);
    fireEvent.click(await screen.findByRole('option', { name: 'alertRules.dataType.metric' }));
    expect(actions.changeDataType).not.toHaveBeenCalled();
  });

  it('keeps periodic expression and evaluation fields editable through the shared draft command', () => {
    const actions = renderFields(
      {
        kind: 'ready',
        status: { hasPromqlExecutor: true, hasSqlExecutor: true }
      },
      { kind: 'periodic', dataType: 'metric' }
    );

    fireEvent.change(screen.getByLabelText('alertRules.expression'), { target: { value: 'up == 0' } });
    fireEvent.change(screen.getByLabelText('alertRules.template'), { target: { value: 'Unavailable' } });
    fireEvent.change(screen.getByLabelText('alertRules.labels'), { target: { value: 'severity=critical' } });

    expect(screen.getByLabelText('alertRules.period')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.times')).toBeInTheDocument();
    expect(actions.update).toHaveBeenCalledWith({ expr: 'up == 0' });
    expect(actions.update).toHaveBeenCalledWith({ template: 'Unavailable' });
    expect(actions.update).toHaveBeenCalledWith({ labelsText: 'severity=critical' });
  });
});

function renderFields(
  datasource: Parameters<typeof AlertRuleFields>[0]['datasource'],
  patch: Partial<ReturnType<typeof createAlertRuleDraft>> = {}
) {
  const changeDataType = vi.fn();
  const changeKind = vi.fn();
  const update = vi.fn();
  render(
    <AlertRuleFields
      draft={{ ...createAlertRuleDraft(), ...patch }}
      busy={false}
      datasource={datasource}
      metricBindings={{
        eligible: false,
        open: false,
        evidence: { kind: 'idle' },
        selectedMonitorIds: [],
        selectedLabels: [],
        labelChoices: []
      }}
      metricTarget={{ apps: { kind: 'idle' }, hierarchy: { kind: 'idle' } }}
      update={update}
      changeDataType={changeDataType}
      changeKind={changeKind}
      changeMetricApplication={vi.fn()}
      changeMetricAuthoringMode={vi.fn()}
      changeMetricBindingIds={vi.fn()}
      changeMetricBindingLabels={vi.fn()}
      changeMetricExpertCondition={vi.fn()}
      changeMetricStructuredCondition={vi.fn()}
      changeMetricTarget={vi.fn()}
      openMetricBindings={vi.fn()}
      cancelMetricBindings={vi.fn()}
      confirmMetricBindings={vi.fn()}
      retryMetricBindings={vi.fn()}
      retryMetricTargetApps={vi.fn()}
      retryMetricTargetHierarchy={vi.fn()}
    />
  );
  return { changeDataType, changeKind, update };
}
