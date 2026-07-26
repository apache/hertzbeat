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

import { createAlertRuleDraft, synchronizeMetricAlertDraftPatch } from '../model/alert-rule-model';
import { useAlertRuleMetricTargetController } from './use-alert-rule-metric-target-controller';

const monitor = vi.hoisted(() => ({
  loadMonitorAppHierarchy: vi.fn(),
  loadMonitorNavigationApps: vi.fn()
}));
vi.mock('@/features/monitor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/monitor')>()),
  loadMonitorAppHierarchy: monitor.loadMonitorAppHierarchy,
  loadMonitorNavigationApps: monitor.loadMonitorNavigationApps
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en-US', resolvedLanguage: 'en-US' } })
}));

const hierarchy: MonitorAppHierarchyNode = {
  category: 'application',
  value: 'springboot3',
  label: 'Spring Boot 3',
  isLeaf: false,
  hide: false,
  type: null,
  unit: null,
  children: []
};

describe('Alert Rule metric target controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    monitor.loadMonitorNavigationApps.mockResolvedValue([
      { category: 'application', value: 'springboot3', label: 'Spring Boot 3', hide: false },
      { category: 'application', value: 'hidden', label: 'Hidden', hide: true },
      { category: '__system__', value: 'system', label: 'System', hide: false }
    ]);
    monitor.loadMonitorAppHierarchy.mockResolvedValue(hierarchy);
  });

  it('loads the localized visible application catalog through the Monitor public boundary', async () => {
    const { result } = renderTarget('');

    await waitFor(() => expect(result.current.state.apps.kind).toBe('ready'));

    expect(monitor.loadMonitorNavigationApps).toHaveBeenCalledWith('en-US', expect.any(AbortSignal));
    expect(result.current.state.apps).toEqual({
      kind: 'ready',
      apps: [{ category: 'application', value: 'springboot3', label: 'Spring Boot 3' }]
    });
    expect(result.current.state.hierarchy).toEqual({ kind: 'idle' });
  });

  it('loads only the selected application hierarchy and aborts stale ownership', async () => {
    let firstSignal: AbortSignal | undefined;
    monitor.loadMonitorAppHierarchy.mockImplementation((app: string, _locale: string, signal: AbortSignal) => {
      if (app === 'springboot3') {
        firstSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
        });
      }
      return Promise.resolve({ ...hierarchy, value: app, label: app });
    });
    const rendered = renderTarget('springboot3');
    await waitFor(() => expect(firstSignal).toBeInstanceOf(AbortSignal));

    rendered.rerender({ selectedApp: 'linux' });

    await waitFor(() => expect(rendered.result.current.state.hierarchy.kind).toBe('ready'));
    expect(firstSignal?.aborted).toBe(true);
    expect(rendered.result.current.state.hierarchy).toMatchObject({
      kind: 'ready',
      hierarchy: { value: 'linux' }
    });
  });

  it.each([
    [new ApiMessageError('request failed', { cause: new TypeError('network unavailable') }), 'unavailable'],
    [new MonitorContractError(), 'error']
  ])('keeps hierarchy failure %s distinct and retries only that read', async (reason, kind) => {
    monitor.loadMonitorAppHierarchy.mockRejectedValueOnce(reason).mockResolvedValueOnce(hierarchy);
    const { result } = renderTarget('springboot3');
    await waitFor(() => expect(result.current.state.hierarchy.kind).toBe(kind));

    await act(async () => result.current.retryHierarchy());

    await waitFor(() => expect(result.current.state.hierarchy.kind).toBe('ready'));
    expect(monitor.loadMonitorAppHierarchy).toHaveBeenCalledTimes(2);
    expect(monitor.loadMonitorNavigationApps).toHaveBeenCalledTimes(1);
  });
});

function renderTarget(selectedApp: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    ({ selectedApp: app }) => {
      const draft = createAlertRuleDraft();
      const expr = app ? `equals(__app__,"${app}") && equals(__metrics__,"summary") && responseTime > 100` : '';
      return useAlertRuleMetricTargetController({
        ...draft,
        ...synchronizeMetricAlertDraftPatch(draft, { expr })
      });
    },
    { initialProps: { selectedApp }, wrapper }
  );
}
