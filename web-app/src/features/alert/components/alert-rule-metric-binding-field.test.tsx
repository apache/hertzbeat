/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertRuleMetricBindingField, type MetricBindingViewState } from './alert-rule-metric-binding-field';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const monitor = {
  id: 7,
  name: 'checkout',
  app: 'springboot3',
  instance: 'checkout-a',
  status: 1,
  labels: { team: 'platform' }
};

describe('Alert Rule metric binding field', () => {
  afterEach(cleanup);

  it('opens only through the explicit management action', () => {
    const open = vi.fn();
    renderField(readyState({ open: false }), { open });

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricBindings.manage' }));

    expect(open).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    [{ kind: 'loading' }, 'alertRules.metricBindings.loading'],
    [{ kind: 'empty' }, 'alertRules.metricBindings.empty'],
    [{ kind: 'unavailable' }, 'alertRules.metricBindings.unavailable'],
    [{ kind: 'contract-error' }, 'alertRules.metricBindings.contractError'],
    [{ kind: 'error' }, 'alertRules.metricBindings.error']
  ] as const)('renders binding evidence %# distinctly', (evidence, message) => {
    const retry = vi.fn();
    renderField(
      {
        eligible: true,
        open: true,
        evidence,
        selectedMonitorIds: [],
        selectedLabels: [],
        labelChoices: []
      },
      { retry }
    );

    expect(screen.getByText(message)).toBeInTheDocument();
    if (evidence.kind === 'unavailable' || evidence.kind === 'contract-error' || evidence.kind === 'error') {
      fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
      expect(retry).toHaveBeenCalledOnce();
    }
  });

  it('allows instance and label selection while delegating cancel and atomic confirmation', () => {
    const changeMonitorIds = vi.fn();
    const changeLabels = vi.fn();
    const cancel = vi.fn();
    const confirm = vi.fn();
    renderField(readyState(), { changeMonitorIds, changeLabels, cancel, confirm });

    fireEvent.click(screen.getByRole('checkbox', { name: 'checkout checkout-a' }));
    expect(changeMonitorIds).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByRole('checkbox', { name: 'team:platform' }));
    expect(changeLabels).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('does not expose a management action for an ineligible draft', () => {
    renderField({
      eligible: false,
      open: false,
      evidence: { kind: 'idle' },
      selectedMonitorIds: [],
      selectedLabels: [],
      labelChoices: []
    });
    expect(screen.queryByRole('button', { name: 'alertRules.metricBindings.manage' })).toBeNull();
  });
});

function renderField(
  state: MetricBindingViewState,
  commands: Partial<Parameters<typeof AlertRuleMetricBindingField>[0]> = {}
) {
  render(
    <AlertRuleMetricBindingField
      busy={false}
      state={state}
      open={vi.fn()}
      cancel={vi.fn()}
      confirm={vi.fn()}
      retry={vi.fn()}
      changeMonitorIds={vi.fn()}
      changeLabels={vi.fn()}
      {...commands}
    />
  );
}

function readyState(patch: Partial<MetricBindingViewState> = {}): MetricBindingViewState {
  return {
    eligible: true,
    open: true,
    evidence: { kind: 'ready', monitors: [monitor], labels: ['team:platform'] },
    selectedMonitorIds: [7],
    selectedLabels: ['team:platform'],
    labelChoices: ['team:platform'],
    ...patch
  };
}
