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
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';

import { AlertGroupRequestFailure, type AlertGroupConverge, type AlertGroupQuery } from '../model/alert-group-model';
import { useAlertGroupController } from './use-alert-group-controller';

const hoisted = vi.hoisted(() => ({
  api: {
    deleteAlertGroups: vi.fn(),
    loadAlertGroup: vi.fn(),
    loadAlertGroups: vi.fn(),
    saveAlertGroup: vi.fn(),
    updateAlertGroupEnabled: vi.fn()
  },
  notify: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  settings: { loadLabelSuggestions: vi.fn() }
}));

vi.mock('../api/alert-group-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-group-api')>()),
  ...hoisted.api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: hoisted.notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/settings', () => hoisted.settings);

export const api = hoisted.api;
export const notify = hoisted.notify;

export const persisted: AlertGroupConverge = {
  id: 7,
  name: 'By service',
  groupLabels: ['service'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 0,
  enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

export function resetAlertGroupControllerFixture() {
  vi.resetAllMocks();
  api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));
  api.loadAlertGroup.mockResolvedValue(persisted);
  api.saveAlertGroup.mockResolvedValue(undefined);
  api.updateAlertGroupEnabled.mockResolvedValue(undefined);
  api.deleteAlertGroups.mockResolvedValue(undefined);
  hoisted.settings.loadLabelSuggestions.mockResolvedValue({ keys: ['environment'], valuesByKey: {} });
}

function sessionProvider(roles: string[], children: PropsWithChildren['children']) {
  return createElement(
    SessionContext.Provider,
    {
      value: {
        session: { authenticated: true, username: 'operator', workspaceId: null, roles, expiresAt: null },
        loading: false,
        retry: () => undefined
      }
    },
    children
  );
}

export function renderController(entry = '/alerts/groups?pageIndex=0&pageSize=8', roles = ['ADMIN']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) =>
    sessionProvider(
      roles,
      createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: [entry] }, children))
    );
  return renderHook(() => useAlertGroupController(), { wrapper });
}

export function renderRoutedController(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertGroupController> | undefined;
  function Probe() {
    controller = useAlertGroupController();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/alerts/groups',
        element: sessionProvider(['ADMIN'], createElement(QueryClientProvider, { client }, createElement(Probe)))
      }
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

export function page(query: AlertGroupQuery, content: AlertGroupConverge[]) {
  const totalElements = content.length;
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / query.pageSize),
    number: query.pageIndex,
    size: query.pageSize
  };
}

export function proofPage(content: AlertGroupConverge[], totalElements: number) {
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / 25),
    number: 0,
    size: 25
  };
}

export function unavailableRequestFailure() {
  return new AlertGroupRequestFailure('unavailable', 'uncertain');
}

export function uncertainRequestFailure() {
  return new AlertGroupRequestFailure('error', 'uncertain');
}

export function rejectedMissingRequestFailure() {
  return new AlertGroupRequestFailure('missing', 'rejected');
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}
