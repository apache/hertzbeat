/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertManagementNav } from '@/features/alert/components/alert-management-nav';
import { AlertNoiseControlNav } from '@/features/alert/components/alert-noise-control-nav';
import { useAlertCenterController } from '@/features/alert/controller/use-alert-center-controller';
import { useAlertRuleEditorController } from '@/features/alert/controller/use-alert-rule-editor-controller';
import { useAlertRuleListController } from '@/features/alert/controller/use-alert-rule-list-controller';

import { getAppRoute } from './route-registry';

const canonical = vi.hoisted(() => ({
  paths: {
    center: '/canonical-alerts',
    rules: '/canonical-alerts/rules',
    ruleNew: '/canonical-alerts/rules/new',
    ruleEdit: '/canonical-alerts/rules/:ruleId/edit',
    groups: '/canonical-alerts/groups',
    inhibits: '/canonical-alerts/inhibits',
    silences: '/canonical-alerts/silences'
  },
  ruleEditPath: vi.fn((ruleId: number) => `/canonical-alerts/rules/${ruleId}/edit`)
}));
const navigate = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));

const alertApi = vi.hoisted(() => ({
  loadAlertGroups: vi.fn(),
  loadAlertSummary: vi.fn()
}));

const ruleApi = vi.hoisted(() => ({
  deleteAlertRules: vi.fn(),
  loadAlertRule: vi.fn(),
  loadAlertRules: vi.fn(),
  previewAlertRule: vi.fn(),
  saveAlertRule: vi.fn(),
  updateAlertRuleEnabled: vi.fn()
}));
const ruleProof = vi.hoisted(() => ({
  proveCreatedAlertRule: vi.fn(),
  proveUpdatedAlertRule: vi.fn()
}));
const metricTargetController = vi.hoisted(() => ({
  useAlertRuleMetricTargetController: vi.fn(() => ({
    state: {
      apps: { kind: 'idle' as const },
      hierarchy: { kind: 'idle' as const }
    },
    retryApps: vi.fn(),
    retryHierarchy: vi.fn()
  }))
}));

vi.mock('@/shared/navigation/app-paths', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/navigation/app-paths')>()),
  alertRoutePaths: canonical.paths,
  buildAlertRuleEditPath: canonical.ruleEditPath
}));
vi.mock('@/features/alert/api/alert-api', () => alertApi);
vi.mock('@/features/alert/api/alert-rule-api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/alert/api/alert-rule-api')>()),
  ...ruleApi
}));
vi.mock('@/features/alert/api/alert-rule-write-proof', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/alert/api/alert-rule-write-proof')>()),
  ...ruleProof
}));
vi.mock('@/features/alert/controller/use-alert-rule-metric-target-controller', () => metricTargetController);
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({
    session: { roles: session.roles },
    loading: false,
    retry: vi.fn()
  })
}));
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Alert route ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.roles = ['ADMIN'];
    alertApi.loadAlertGroups.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 8
    });
    alertApi.loadAlertSummary.mockResolvedValue({
      total: 0,
      dealNum: 0,
      rate: 0,
      priorityWarningNum: 0,
      priorityCriticalNum: 0,
      priorityEmergencyNum: 0
    });
    ruleApi.loadAlertRules.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 8
    });
  });

  it('derives the application catalog and both Alert navigation controls from the inward contract', () => {
    expect(getAppRoute('alerts').path).toBe(canonical.paths.center);
    expect(getAppRoute('alert-rules').path).toBe(canonical.paths.rules);
    expect(getAppRoute('alert-rule-new').path).toBe(canonical.paths.ruleNew);
    expect(getAppRoute('alert-rule-edit').path).toBe(canonical.paths.ruleEdit);
    expect(getAppRoute('alert-groups').path).toBe(canonical.paths.groups);
    expect(getAppRoute('alert-inhibits').path).toBe(canonical.paths.inhibits);
    expect(getAppRoute('alert-silences').path).toBe(canonical.paths.silences);

    renderNavigation(<AlertManagementNav />, canonical.paths.center);
    fireEvent.click(screen.getByRole('tab', { name: 'alertNavigation.rules' }));
    expect(navigate).toHaveBeenLastCalledWith(canonical.paths.rules);

    renderNavigation(<AlertNoiseControlNav />, canonical.paths.groups);
    fireEvent.click(screen.getByText('alertNavigation.inhibits'));
    expect(navigate).toHaveBeenLastCalledWith(canonical.paths.inhibits);
  });

  it('drives list, editor, and center controller navigation from the same contract', async () => {
    const list = renderRoutedController(canonical.paths.rules, useAlertRuleListController);
    await waitFor(() => expect(list.result.current.state.list.kind).toBe('empty'));
    act(() => list.result.current.create());
    expect(navigate).toHaveBeenLastCalledWith(canonical.paths.ruleNew);
    act(() => list.result.current.edit(17));
    expect(navigate).toHaveBeenLastCalledWith('/canonical-alerts/rules/17/edit');
    expect(canonical.ruleEditPath).toHaveBeenCalledWith(17);

    const editor = renderRoutedController(canonical.paths.ruleNew, () => useAlertRuleEditorController('new'));
    act(() => editor.result.current.cancel());
    expect(navigate).toHaveBeenLastCalledWith(canonical.paths.rules);
    act(() =>
      editor.result.current.updateDraft({
        name: 'Canonical rule',
        expr: 'usage > 90',
        template: 'Alert',
        period: 300,
        times: 3
      })
    );
    await waitFor(() => expect(editor.result.current.state.draft?.name).toBe('Canonical rule'));
    await act(async () => editor.result.current.save());
    expect(ruleApi.saveAlertRule).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenLastCalledWith(canonical.paths.rules);

    const center = renderRoutedController(canonical.paths.center, useAlertCenterController);
    await waitFor(() => expect(center.result.current.state.list.kind).toBe('empty'));
    act(() => center.result.current.manageRules());
    expect(navigate).toHaveBeenLastCalledWith(canonical.paths.rules);
  });
});

function renderNavigation(navigation: ReactNode, entry: string) {
  return render(<MemoryRouter initialEntries={[entry]}>{navigation}</MemoryRouter>);
}

function renderRoutedController<Result>(entry: string, useController: () => Result) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(useController, { wrapper });
}
