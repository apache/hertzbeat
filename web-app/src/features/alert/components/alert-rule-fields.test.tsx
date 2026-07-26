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
});

function renderFields(
  datasource: Parameters<typeof AlertRuleFields>[0]['datasource'],
  patch: Partial<ReturnType<typeof createAlertRuleDraft>> = {}
) {
  const changeDataType = vi.fn();
  const changeKind = vi.fn();
  render(
    <AlertRuleFields
      draft={{ ...createAlertRuleDraft(), ...patch }}
      busy={false}
      datasource={datasource}
      metricTarget={{ apps: { kind: 'idle' }, hierarchy: { kind: 'idle' } }}
      update={vi.fn()}
      changeDataType={changeDataType}
      changeKind={changeKind}
      changeMetricApplication={vi.fn()}
      changeMetricTarget={vi.fn()}
      retryMetricTargetApps={vi.fn()}
      retryMetricTargetHierarchy={vi.fn()}
    />
  );
  return { changeDataType, changeKind };
}
