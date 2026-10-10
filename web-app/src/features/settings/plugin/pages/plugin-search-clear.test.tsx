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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  load: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  toggle: vi.fn(),
  loadParams: vi.fn(),
  saveParams: vi.fn()
}));
vi.mock('../api/plugin-api', async original => ({
  ...(await original<typeof import('../api/plugin-api')>()),
  loadPlugins: api.load,
  uploadPlugin: api.upload,
  deletePlugins: api.remove,
  updatePluginStatus: api.toggle,
  loadPluginParams: api.loadParams,
  savePluginParams: api.saveParams
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: ['ADMIN'] } })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { PluginPage } from './plugin-page';

beforeEach(() => {
  vi.resetAllMocks();
  api.load.mockImplementation(query =>
    Promise.resolve({ content: [], number: query.pageIndex, size: query.pageSize, totalElements: 0, totalPages: 0 })
  );
});
afterEach(cleanup);
function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}
function mount(path = '/settings/plugins') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ConfigProvider theme={{ token: { motion: false } }}>
          <App>
            <Location />
            <PluginPage />
          </App>
        </ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
function clear() {
  const icon = document.querySelector('.ant-input-clear-icon');
  expect(icon).not.toBeNull();
  fireEvent.click(icon!);
}
function noMutation() {
  expect(api.upload).not.toHaveBeenCalled();
  expect(api.remove).not.toHaveBeenCalled();
  expect(api.toggle).not.toHaveBeenCalled();
  expect(api.saveParams).not.toHaveBeenCalled();
}

it('clears an applied URL search and page index immediately and refreshes the unfiltered empty list', async () => {
  mount('/settings/plugins?search=audit-plugin-no-match&pageIndex=3&pageSize=20');
  await screen.findByText('plugins.searchEmpty');
  expect(screen.getByRole('searchbox')).toHaveValue('audit-plugin-no-match');
  clear();
  await screen.findByText('plugins.empty');
  expect(screen.getByRole('searchbox')).toHaveValue('');
  const params = new URLSearchParams(screen.getByTestId('location').textContent);
  expect(params.has('search')).toBe(false);
  expect(params.get('pageIndex')).toBe('0');
  expect(params.get('pageSize')).toBe('20');
  expect(api.load).toHaveBeenLastCalledWith({ search: '', pageIndex: 0, pageSize: 20 }, expect.anything());
  const reads = api.load.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
  await waitFor(() => expect(api.load).toHaveBeenCalledTimes(reads + 1));
  expect(api.load).toHaveBeenLastCalledWith({ search: '', pageIndex: 0, pageSize: 20 }, expect.anything());
  noMutation();
});

it('applies entered search, clears via X without another Enter, and survives a page remount', async () => {
  mount();
  await screen.findByText('plugins.empty');
  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value: ' audit-plugin-no-match ' } });
  expect(new URLSearchParams(screen.getByTestId('location').textContent).has('search')).toBe(false);
  expect(api.load).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
  fireEvent.keyUp(input, { key: 'Enter', keyCode: 13 });
  await screen.findByText('plugins.searchEmpty');
  expect(new URLSearchParams(screen.getByTestId('location').textContent).get('search')).toBe('audit-plugin-no-match');
  clear();
  await screen.findByText('plugins.empty');
  const clearedPath = '/settings/plugins' + screen.getByTestId('location').textContent;
  cleanup();
  mount(clearedPath);
  await screen.findByText('plugins.empty');
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(api.load).toHaveBeenLastCalledWith({ search: '', pageIndex: 0, pageSize: 8 }, expect.anything());
  noMutation();
});

it('clears an unsubmitted draft and accepts an explicitly submitted empty search', async () => {
  mount();
  await screen.findByText('plugins.empty');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'unsubmitted' } });
  clear();
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.queryByText('plugins.searchEmpty')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'audit' } });
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter', keyCode: 13 });
  fireEvent.keyUp(screen.getByRole('searchbox'), { key: 'Enter', keyCode: 13 });
  await screen.findByText('plugins.searchEmpty');
  await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('audit'));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  expect(screen.getByRole('searchbox')).toHaveValue('');
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter', keyCode: 13 });
  fireEvent.keyUp(screen.getByRole('searchbox'), { key: 'Enter', keyCode: 13 });
  await screen.findByText('plugins.empty');
  expect(new URLSearchParams(screen.getByTestId('location').textContent).has('search')).toBe(false);
  noMutation();
});
