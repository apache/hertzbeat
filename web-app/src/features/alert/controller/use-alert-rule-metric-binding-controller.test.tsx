/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { MonitorContractError, type MonitorAppHierarchyNode } from '@/features/monitor';

import { buildMetricAlertBindingsPatch, createAlertRuleDraft, type AlertRuleDraft } from '../model/alert-rule-model';
import type { AlertRuleMetricTargetState } from './use-alert-rule-metric-target-controller';
import { useAlertRuleMetricBindingController } from './use-alert-rule-metric-binding-controller';

const monitorApi = vi.hoisted(() => ({ loadMonitorsByApp: vi.fn() }));
vi.mock('@/features/monitor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/monitor')>()),
  loadMonitorsByApp: monitorApi.loadMonitorsByApp
}));

const monitors = [
  {
    id: 7,
    name: 'checkout',
    app: 'springboot3',
    instance: 'checkout-a',
    status: 1,
    labels: { team: 'platform' }
  },
  {
    id: 8,
    name: 'billing',
    app: 'springboot3',
    instance: 'billing-a',
    status: 1,
    labels: { env: 'prod' }
  }
];

describe('Alert Rule metric binding controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    monitorApi.loadMonitorsByApp.mockResolvedValue(monitors);
  });

  it.each(['availability', 'metric'] as const)('loads app-scoped choices for a selected %s target', async kind => {
    const updateDraft = vi.fn();
    const draft = targetedDraft(kind);
    const { result } = renderBinding(draft, updateDraft);

    act(() => result.current.open());

    await waitFor(() => expect(result.current.state.evidence.kind).toBe('ready'));
    expect(monitorApi.loadMonitorsByApp).toHaveBeenCalledWith('springboot3', expect.any(AbortSignal));
    expect(result.current.state.open).toBe(true);
  });

  it('keeps empty, unavailable, contract, and generic failures distinct with an isolated retry', async () => {
    const failures = [
      [[], 'empty'],
      [new ApiMessageError('offline', { cause: new TypeError('network') }), 'unavailable'],
      [new MonitorContractError(), 'contract-error'],
      [new Error('boom'), 'error']
    ] as const;
    for (const [outcome, expected] of failures) {
      vi.clearAllMocks();
      monitorApi.loadMonitorsByApp.mockImplementationOnce(() =>
        outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome)
      );
      const { result, unmount } = renderBinding(targetedDraft('availability'), vi.fn());
      act(() => result.current.open());
      await waitFor(() => expect(result.current.state.evidence.kind).toBe(expected));

      monitorApi.loadMonitorsByApp.mockResolvedValueOnce(monitors);
      await act(async () => result.current.retry());
      await waitFor(() => expect(result.current.state.evidence.kind).toBe('ready'));
      expect(monitorApi.loadMonitorsByApp).toHaveBeenCalledTimes(2);
      unmount();
    }
  });

  it('stages instance and label changes, discards cancel, and confirms one atomic model patch', async () => {
    const updateDraft = vi.fn();
    const draft = targetedDraft('availability', [7], ['team:platform']);
    const { result } = renderBinding(draft, updateDraft);
    act(() => result.current.open());
    await waitFor(() => expect(result.current.state.evidence.kind).toBe('ready'));

    act(() => result.current.changeMonitorIds([8]));
    act(() => result.current.changeLabels(['env:prod']));
    act(() => result.current.cancel());
    expect(updateDraft).not.toHaveBeenCalled();

    act(() => result.current.open());
    await waitFor(() => expect(result.current.state.evidence.kind).toBe('ready'));
    expect(result.current.state.selectedMonitorIds).toEqual([7]);
    expect(result.current.state.selectedLabels).toEqual(['team:platform']);
    act(() => result.current.changeMonitorIds([8]));
    act(() => result.current.changeLabels(['env:prod']));
    act(() => result.current.confirm());

    expect(updateDraft).toHaveBeenCalledOnce();
    expect(updateDraft).toHaveBeenCalledWith(buildMetricAlertBindingsPatch(draft, [8], ['env:prod'], []));
    expect(result.current.state.open).toBe(false);
  });

  it('can remove a persisted label when the application currently has no monitors', async () => {
    monitorApi.loadMonitorsByApp.mockResolvedValue([]);
    const updateDraft = vi.fn();
    const draft = targetedDraft('availability', [], ['team:retired']);
    const { result } = renderBinding(draft, updateDraft);
    act(() => result.current.open());
    await waitFor(() => expect(result.current.state.evidence.kind).toBe('empty'));

    expect(result.current.state.labelChoices).toEqual(['team:retired']);
    act(() => result.current.changeLabels([]));
    act(() => result.current.confirm());

    expect(updateDraft).toHaveBeenCalledWith(buildMetricAlertBindingsPatch(draft, [], [], []));
  });

  it('permanently retires staged bindings when the application or target changes', async () => {
    const updateDraft = vi.fn();
    const first = targetedDraft('availability');
    const rendered = renderBinding(first, updateDraft);
    act(() => rendered.result.current.open());
    await waitFor(() => expect(rendered.result.current.state.evidence.kind).toBe('ready'));
    act(() => rendered.result.current.changeMonitorIds([7]));

    rendered.rerender({ draft: targetedDraft('metric'), state: targetState });

    expect(rendered.result.current.state.open).toBe(false);
    act(() => rendered.result.current.confirm());
    expect(updateDraft).not.toHaveBeenCalled();

    rendered.rerender({ draft: first, state: targetState });

    expect(rendered.result.current.state.open).toBe(false);
    expect(rendered.result.current.state.selectedMonitorIds).toEqual([]);
  });

  it('permanently retires a metric session when hierarchy evidence temporarily leaves ready', async () => {
    const draft = targetedDraft('metric');
    const rendered = renderBinding(draft, vi.fn());
    act(() => rendered.result.current.open());
    await waitFor(() => expect(rendered.result.current.state.evidence.kind).toBe('ready'));
    act(() => rendered.result.current.changeMonitorIds([7]));

    rendered.rerender({ draft, state: loadingTargetState });
    expect(rendered.result.current.state.open).toBe(false);

    rendered.rerender({ draft, state: targetState });
    expect(rendered.result.current.state.open).toBe(false);
    expect(rendered.result.current.state.selectedMonitorIds).toEqual([]);
  });

  it('cannot open inactive, untargeted, or unsafe raw metric drafts', () => {
    for (const draft of [createAlertRuleDraft(), untargetedDraft(), unparsedDraft(), crossApplicationDraft()]) {
      const { result, unmount } = renderBinding(draft, vi.fn());
      act(() => result.current.open());
      expect(result.current.state).toMatchObject({ eligible: false, open: false, evidence: { kind: 'idle' } });
      unmount();
    }
    expect(monitorApi.loadMonitorsByApp).not.toHaveBeenCalled();
  });
});

function renderBinding(initialDraft: AlertRuleDraft, updateDraft: (patch: Partial<AlertRuleDraft>) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    ({ draft, state }: { draft: AlertRuleDraft; state: AlertRuleMetricTargetState }) =>
      useAlertRuleMetricBindingController(draft, state, updateDraft),
    { initialProps: { draft: initialDraft, state: targetState }, wrapper }
  );
}

function targetedDraft(
  target: 'availability' | 'metric',
  monitorIds: number[] = [],
  monitorLabels: string[] = []
): AlertRuleDraft {
  const metricTarget =
    target === 'availability'
      ? { kind: 'availability' as const, app: 'springboot3' }
      : { kind: 'metric' as const, app: 'springboot3', metric: 'summary' };
  return {
    ...createAlertRuleDraft(),
    expr: target === 'availability' ? 'equals(__app__,"springboot3") && equals(__available__,"down")' : '',
    metricEditor: {
      kind: 'targeted',
      app: 'springboot3',
      target: metricTarget,
      monitorIds,
      monitorLabels,
      authoring: { mode: 'structured', condition: { kind: 'group', join: 'and', items: [] } }
    }
  };
}

function untargetedDraft(): AlertRuleDraft {
  return {
    ...createAlertRuleDraft(),
    metricEditor: {
      kind: 'targeted',
      app: 'springboot3',
      target: null,
      monitorIds: [],
      monitorLabels: [],
      authoring: { mode: 'structured', condition: { kind: 'group', join: 'and', items: [] } }
    }
  };
}

function unparsedDraft(): AlertRuleDraft {
  return {
    ...createAlertRuleDraft(),
    expr: 'custom(value)',
    metricEditor: { kind: 'unparsed', expression: 'custom(value)' }
  };
}

function crossApplicationDraft(): AlertRuleDraft {
  const draft = targetedDraft('availability');
  if (draft.metricEditor?.kind !== 'targeted') return draft;
  return {
    ...draft,
    metricEditor: {
      ...draft.metricEditor,
      target: { kind: 'availability', app: 'linux' }
    }
  };
}

const hierarchy: MonitorAppHierarchyNode = {
  category: 'application',
  value: 'springboot3',
  label: 'Spring Boot 3',
  isLeaf: false,
  hide: false,
  type: null,
  unit: null,
  children: [
    {
      category: null,
      value: 'summary',
      label: 'Summary',
      isLeaf: false,
      hide: false,
      type: null,
      unit: null,
      children: []
    }
  ]
};

const targetState: AlertRuleMetricTargetState = {
  apps: { kind: 'ready', apps: [] },
  hierarchy: { kind: 'ready', hierarchy }
};

const loadingTargetState: AlertRuleMetricTargetState = {
  apps: { kind: 'ready', apps: [] },
  hierarchy: { kind: 'loading' }
};
