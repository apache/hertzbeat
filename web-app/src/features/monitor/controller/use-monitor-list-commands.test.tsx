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
import { App } from 'antd';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const api = vi.hoisted(() => ({ mutateMonitors: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  mutateMonitors: api.mutateMonitors
}));

import { useMonitorListCommands } from './use-monitor-list-commands';

describe('useMonitorListCommands copy permission', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => vi.clearAllMocks());

  it('fails closed before the API when a direct copy handler lacks capability', async () => {
    const selection = { remove: vi.fn(), validatedIds: vi.fn(() => [7]) };
    const view = renderHook(() => useMonitorListCommands('page=0', vi.fn(), selection, { canWrite: false }), {
      wrapper
    });

    await act(() => view.result.current.run('copy', [7]));

    expect(api.mutateMonitors).not.toHaveBeenCalled();
    expect(selection.remove).not.toHaveBeenCalled();
  });
});

function wrapper({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <App>{children}</App>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
