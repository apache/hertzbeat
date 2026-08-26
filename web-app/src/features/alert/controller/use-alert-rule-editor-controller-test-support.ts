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
import { render, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { AlertRule, AlertRuleQuery } from '../model/alert-rule-model';
import { useAlertRuleEditorController } from './use-alert-rule-editor-controller';

const hoisted = vi.hoisted(() => ({
  api: {
    loadAlertRuleDatasourceStatus: vi.fn(),
    loadAlertRule: vi.fn(),
    loadAlertRules: vi.fn(),
    previewAlertRule: vi.fn(),
    saveAlertRule: vi.fn()
  },
  monitor: {
    loadMonitorAppHierarchy: vi.fn(),
    loadMonitorNavigationApps: vi.fn()
  },
  notify: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  session: { roles: ['ADMIN'] as string[] }
}));

vi.mock('../api/alert-rule-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-rule-api')>()),
  ...hoisted.api
}));
vi.mock('@/features/monitor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/monitor')>()),
  loadMonitorAppHierarchy: hoisted.monitor.loadMonitorAppHierarchy,
  loadMonitorNavigationApps: hoisted.monitor.loadMonitorNavigationApps
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: hoisted.notify }) }
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US', resolvedLanguage: 'en-US' }
  })
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { roles: hoisted.session.roles }, loading: false, retry: vi.fn() })
}));

export const api = hoisted.api;
export const monitor = hoisted.monitor;
export const notify = hoisted.notify;
export const session = hoisted.session;

export const persisted: AlertRule = {
  id: 7,
  name: 'CPU',
  type: 'realtime_metric',
  datasource: 'promql',
  expr: 'usage > 90',
  period: null,
  times: null,
  labels: { severity: 'critical' },
  annotations: { summary: 'CPU' },
  template: null,
  enable: true
};

export function resetAlertRuleEditorFixture() {
  vi.clearAllMocks();
  session.roles = ['ADMIN'];
  api.loadAlertRuleDatasourceStatus.mockResolvedValue({ hasPromqlExecutor: true, hasSqlExecutor: true });
  api.loadAlertRule.mockResolvedValue(persisted);
  api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => Promise.resolve(page(query, [])));
  api.previewAlertRule.mockResolvedValue(previewEvidence(0));
  api.saveAlertRule.mockResolvedValue(undefined);
  monitor.loadMonitorNavigationApps.mockResolvedValue([]);
  monitor.loadMonitorAppHierarchy.mockResolvedValue({
    category: null,
    value: 'springboot3',
    label: 'Spring Boot 3',
    isLeaf: false,
    hide: false,
    type: null,
    unit: null,
    children: []
  });
}

export function validDraft() {
  return { name: ' New Rule ', expr: 'usage > 90', template: 'Alert', period: 300, times: 3 };
}

export function previewEvidence(rowCount: number) {
  return {
    rowCount,
    rows: Array.from({ length: rowCount }, (_value, index) => ({ value: index + 1 }))
  };
}

export function renderController(mode: 'new' | 'edit', entry = '/alerts/rules/7/edit') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        { initialEntries: [entry] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/alerts/rules/new', element: children }),
          createElement(Route, { path: '/alerts/rules/:ruleId/edit', element: children })
        )
      )
    );
  return renderHook(() => useAlertRuleEditorController(mode), { wrapper });
}

export function renderRouted(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertRuleEditorController> | undefined;
  function Probe({ mode }: { mode: 'new' | 'edit' }) {
    controller = useAlertRuleEditorController(mode);
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/alerts/rules/new',
        element: createElement(QueryClientProvider, { client }, createElement(Probe, { mode: 'new' }))
      },
      {
        path: '/alerts/rules/:ruleId/edit',
        element: createElement(QueryClientProvider, { client }, createElement(Probe, { mode: 'edit' }))
      },
      { path: '/alerts/rules', element: null }
    ],
    { initialEntries: entries, initialIndex: 0 }
  );
  render(createElement(RouterProvider, { router }));
  return {
    router,
    current: () => {
      if (!controller) throw new Error('not mounted');
      return controller;
    }
  };
}

export function page(query: AlertRuleQuery, content: AlertRule[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: Math.ceil(content.length / query.pageSize),
    number: query.pageIndex,
    size: query.pageSize
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
