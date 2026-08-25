/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

const secondMonitor = {
  id: 8,
  name: 'billing',
  app: 'springboot3',
  instance: 'billing-a',
  status: 1,
  labels: { env: 'prod' }
};

describe('Alert Rule metric binding field', () => {
  afterEach(cleanup);

  it('opens only through the explicit management action', () => {
    const open = vi.fn();
    renderField(readyState({ open: false }), { open });

    const manage = screen.getByRole('button', { name: 'alertRules.metricBindings.manage' });
    expect(manage.className).toContain('bindingManageButton');
    fireEvent.click(manage);

    expect(open).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    [{ kind: 'loading' }, 'alertRules.metricBindings.loading'],
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
        selectedLabels: []
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

    const associated = screen.getByRole('region', { name: 'alertRules.metricBindings.associated' });
    fireEvent.click(within(associated).getByRole('checkbox', { name: 'checkout checkout-a' }));
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricBindings.moveLeft' }));
    expect(changeMonitorIds).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricBindings.removeLabel: team:platform' }));
    expect(changeLabels).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('keeps the source 60% dual-transfer workspace visible when the application has no monitors', () => {
    renderField({
      eligible: true,
      open: true,
      evidence: { kind: 'empty' },
      selectedMonitorIds: [],
      selectedLabels: []
    });

    expect(document.querySelector('.ant-modal')).toHaveStyle({ width: '60%' });
    expect(screen.getByText('alertRules.metricBindings.instances')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'alertRules.metricBindings.unassociated' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'alertRules.metricBindings.associated' })).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('alertRules.metricBindings.filterName')).toHaveLength(2);
    expect(screen.getAllByRole('combobox', { name: 'alertRules.metricBindings.filterLabels' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'alertRules.metricBindings.moveRight' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.metricBindings.moveLeft' })).toBeDisabled();
    expect(screen.getByText('alertRules.metricBindings.labelEmpty')).toBeInTheDocument();
  });

  it('filters each side independently and moves selected monitors between source lists', () => {
    const changeMonitorIds = vi.fn();
    renderField(readyState({ evidence: { kind: 'ready', monitors: [monitor, secondMonitor] } }), { changeMonitorIds });

    const left = screen.getByRole('region', { name: 'alertRules.metricBindings.unassociated' });
    const right = screen.getByRole('region', { name: 'alertRules.metricBindings.associated' });
    fireEvent.change(within(left).getByPlaceholderText('alertRules.metricBindings.filterName'), {
      target: { value: 'bill' }
    });
    expect(within(left).getByText('billing')).toBeInTheDocument();
    expect(within(left).queryByText('checkout')).not.toBeInTheDocument();
    expect(within(right).getByText('checkout')).toBeInTheDocument();

    fireEvent.click(within(left).getByRole('checkbox', { name: 'alertRules.metricBindings.selectAll.unassociated' }));
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricBindings.moveRight' }));
    expect(changeMonitorIds).toHaveBeenCalledWith([7, 8]);
  });

  it('adds and removes free-form label associations and shows matching monitors', () => {
    const changeLabels = vi.fn();
    renderField(readyState(), { changeLabels });

    expect(screen.getAllByText('checkout')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricBindings.addLabel' }));
    const input = screen.getByRole('textbox', { name: 'alertRules.metricBindings.addLabel' });
    fireEvent.change(input, { target: { value: 'region:east' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(changeLabels).toHaveBeenCalledTimes(1);
    expect(changeLabels).toHaveBeenCalledWith(['team:platform', 'region:east']);

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricBindings.removeLabel: team:platform' }));
    expect(changeLabels).toHaveBeenCalledTimes(2);
    expect(changeLabels).toHaveBeenCalledWith([]);
  });

  it('keeps the master association row visible but disabled until a target is eligible', () => {
    renderField({
      eligible: false,
      open: false,
      evidence: { kind: 'idle' },
      selectedMonitorIds: [],
      selectedLabels: []
    });
    expect(screen.getByRole('button', { name: 'alertRules.metricBindings.manage' })).toBeDisabled();
    expect(screen.getByText('alertRules.metricBindings.title')).toBeInTheDocument();
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
    evidence: { kind: 'ready', monitors: [monitor] },
    selectedMonitorIds: [7],
    selectedLabels: ['team:platform'],
    ...patch
  };
}
