/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { App, ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditorView } from '@codemirror/view';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RuntimeThemeContext } from '@/core/runtime-theme-context';

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  detail: vi.fn(),
  validate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  visibility: vi.fn()
}));
vi.mock('../api/monitor-definition-api', async original => ({
  ...(await original<typeof import('../api/monitor-definition-api')>()),
  loadMonitorDefinitionCatalog: api.catalog,
  loadMonitorDefinitionDetail: api.detail,
  validateMonitorDefinition: api.validate,
  createMonitorDefinition: api.create,
  updateMonitorDefinition: api.update,
  deleteMonitorDefinition: api.remove,
  updateMonitorDefinitionVisibility: api.visibility
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: ['ADMIN'] } })
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US' } })
}));

import { MonitorDefinitionRequestError } from '../api/monitor-definition-api';
import { MonitorDefinitionPage } from './monitor-definition-page';

const detail = {
  schemaVersion: 1,
  app: 'mysql',
  label: 'MySQL',
  origin: 'builtin',
  editable: true,
  deletable: false,
  hidden: false,
  revision: 'a'.repeat(64),
  definition: 'app: mysql'
};
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeEach(() => {
  vi.resetAllMocks();
  api.catalog.mockResolvedValue({ schemaVersion: 1, items: [detail] });
  api.detail.mockResolvedValue(detail);
  api.validate.mockResolvedValue({ schemaVersion: 1, valid: true, app: 'mysql', origin: 'override' });
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach(router => router.dispose());
});

function mount(initialEntries = ['/outside', '/definitions?app=mysql', '/outside'], initialIndex = 1) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <Link to="/outside">Monitor center</Link>
            <Outlet />
          </>
        ),
        children: [
          { path: '/definitions', element: <MonitorDefinitionPage /> },
          { path: '/outside', element: <h1>Outside</h1> }
        ]
      }
    ],
    { initialEntries, initialIndex }
  );
  routers.push(router);
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <RuntimeThemeContext.Provider value={{ theme: 'default', setTheme: vi.fn() }}>
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </RuntimeThemeContext.Provider>
      </App>
    </ConfigProvider>
  );
  return router;
}
async function draft() {
  return screen.findByRole('textbox', { name: 'monitorDefinitions.draft' });
}
function typeYaml(value: string) {
  const view = EditorView.findFromDOM(screen.getByRole('textbox', { name: 'monitorDefinitions.draft' }))!;
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } }));
}
async function choose(action: 'cancel' | 'discardChanges') {
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'common.' + action }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}
function noWrite() {
  expect(api.create).not.toHaveBeenCalled();
  expect(api.update).not.toHaveBeenCalled();
  expect(api.remove).not.toHaveBeenCalled();
  expect(api.visibility).not.toHaveBeenCalled();
}

it.each(['sidebar', 'Back', 'Forward'] as const)(
  'protects a dirty definition on %s, retaining on Cancel and leaving only on Discard',
  async action => {
    const router = mount();
    await draft();
    typeYaml('app: mysql\nname: draft');
    const leave = async () => {
      if (action === 'sidebar') fireEvent.click(screen.getByRole('link', { name: 'Monitor center' }));
      else await act(() => router.navigate(action === 'Back' ? -1 : 1));
    };
    await leave();
    await screen.findByRole('dialog');
    expect(router.state.location.pathname).toBe('/definitions');
    await choose('cancel');
    expect(await draft()).toHaveTextContent('name: draft');
    await leave();
    await choose('discardChanges');
    await screen.findByRole('heading', { name: 'Outside' });
    noWrite();
  }
);

it.each(['unchanged', 'reverted', 'cancelled'] as const)('does not block a %s definition', async kind => {
  const router = mount();
  await draft();
  if (kind !== 'unchanged') typeYaml('app: mysql\nname: draft');
  if (kind === 'reverted') typeYaml('app: mysql');
  if (kind === 'cancelled') fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  fireEvent.click(screen.getByRole('link', { name: 'Monitor center' }));
  await screen.findByRole('heading', { name: 'Outside' });
  expect(router.state.location.pathname).toBe('/outside');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  noWrite();
});

it.each(['valid', 'invalid'] as const)(
  'keeps a new %s draft visible after validation and supports correction and revalidation',
  async outcome => {
    mount(['/definitions'], 0);
    await screen.findByText('monitorDefinitions.workspaceEmptyTitle');
    fireEvent.click(screen.getByRole('button', { name: 'monitorDefinitions.create' }));
    await draft();
    const initial = outcome === 'valid' ? 'app: audit_unsaved_template' : 'app: [';
    typeYaml(initial);
    if (outcome === 'invalid') api.validate.mockRejectedValueOnce(new MonitorDefinitionRequestError('invalid'));
    fireEvent.click(screen.getByRole('button', { name: 'monitorDefinitions.validate' }));
    await waitFor(() => expect(api.validate).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'monitorDefinitions.validate' })).not.toHaveClass('ant-btn-loading')
    );
    expect(await draft()).toHaveTextContent(initial);
    if (outcome === 'invalid') {
      expect(screen.getByText('monitorDefinitions.failure.invalid')).toBeVisible();
      expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    }
    typeYaml('app: corrected_draft');
    fireEvent.click(screen.getByRole('button', { name: 'monitorDefinitions.validate' }));
    await waitFor(() => expect(api.validate).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('monitorDefinitions.validated')).toBeVisible());
    expect(await draft()).toHaveTextContent('app: corrected_draft');
    expect(api.validate).toHaveBeenLastCalledWith({
      operation: 'create',
      expectedApp: null,
      definition: 'app: corrected_draft'
    });
    expect(screen.getByRole('button', { name: 'common.save' })).toBeEnabled();
    noWrite();
  }
);

it.each(['valid', 'invalid'] as const)(
  'retains the existing-definition diff after %s validation and restores clean authority on correction',
  async outcome => {
    mount();
    await draft();
    const value = outcome === 'valid' ? 'app: mysql\nname: draft' : 'app: [';
    typeYaml(value);
    if (outcome === 'invalid') api.validate.mockRejectedValueOnce(new MonitorDefinitionRequestError('invalid'));
    fireEvent.click(screen.getByRole('button', { name: 'monitorDefinitions.validate' }));
    await waitFor(() => expect(api.validate).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'monitorDefinitions.validate' })).not.toHaveClass('ant-btn-loading')
    );
    expect(EditorView.findFromDOM(await draft())!.state.doc.toString()).toBe(value);
    expect(await draft()).toHaveTextContent(value.replaceAll('\n', ''));
    expect(screen.getByRole('textbox', { name: 'monitorDefinitions.authoritative' })).toHaveTextContent('app: mysql');
    if (outcome === 'invalid') expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    typeYaml('app: mysql');
    fireEvent.click(screen.getByRole('button', { name: 'monitorDefinitions.validate' }));
    await waitFor(() => expect(api.validate).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('monitorDefinitions.validated')).toBeVisible());
    expect(await draft()).toHaveTextContent('app: mysql');
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(await draft()).toHaveTextContent('app: mysql');
    noWrite();
  }
);

it('guards reload only while a draft is dirty and releases it on explicit Cancel', async () => {
  mount();
  await draft();
  typeYaml('app: mysql\nname: draft');
  const dirtyEvent = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(dirtyEvent);
  expect(dirtyEvent.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  const cleanEvent = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(cleanEvent);
  expect(cleanEvent.defaultPrevented).toBe(false);
  noWrite();
});

it('releases navigation after a mocked canonical create save', async () => {
  const saved = {
    ...detail,
    app: 'audit_mock_save',
    origin: 'custom',
    deletable: true,
    definition: 'app: audit_mock_save'
  };
  api.create.mockResolvedValue(saved);
  api.detail.mockResolvedValue(saved);
  const router = mount(['/definitions'], 0);
  await screen.findByText('monitorDefinitions.workspaceEmptyTitle');
  fireEvent.click(screen.getByRole('button', { name: 'monitorDefinitions.create' }));
  await draft();
  typeYaml(saved.definition);
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
  await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled());
  expect(await draft()).toHaveTextContent(saved.definition);
  fireEvent.click(screen.getByRole('link', { name: 'Monitor center' }));
  await screen.findByRole('heading', { name: 'Outside' });
  expect(router.state.location.pathname).toBe('/outside');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.update).not.toHaveBeenCalled();
  expect(api.remove).not.toHaveBeenCalled();
});
