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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const { loadObjectStore, saveObjectStore } = vi.hoisted(() => ({
  loadObjectStore: vi.fn(),
  saveObjectStore: vi.fn()
}));

vi.mock('../api/object-store-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/object-store-api')>()),
  loadObjectStore,
  saveObjectStore
}));

import { ObjectStorePage } from './object-store-page';

const configuredObs = {
  type: 'OBS',
  config: { accessKey: 'ak', secretKey: 'sk', bucketName: 'bucket', endpoint: 'https://obs.cn-north-4.myhuaweicloud.com', savePath: 'hertzbeat' }
};

describe('ObjectStorePage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    loadObjectStore.mockResolvedValue(configuredObs);
    saveObjectStore.mockResolvedValue('success');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('discards local edits without writing backend configuration', async () => {
    renderObjectStorePage();
    const accessKey = await screen.findByPlaceholderText('OBS access key');
    fireEvent.change(accessKey, { target: { value: 'changed-ak' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(screen.getByPlaceholderText('OBS access key')).toHaveValue('ak');
    expect(saveObjectStore).not.toHaveBeenCalled();
  });

  it('blocks incomplete OBS configuration and saves a complete draft', async () => {
    loadObjectStore.mockResolvedValue({ type: 'OBS', config: {} });
    renderObjectStorePage();
    const accessKey = await screen.findByPlaceholderText('OBS access key');
    fireEvent.change(accessKey, { target: { value: ' ak ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Complete the required object storage fields.')).toBeInTheDocument();
    expect(saveObjectStore).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('OBS secret key'), { target: { value: ' sk ' } });
    fireEvent.change(screen.getByPlaceholderText('OBS bucket name'), { target: { value: ' bucket ' } });
    fireEvent.change(screen.getByPlaceholderText('For example, https://obs.cn-north-4.myhuaweicloud.com'), { target: { value: ' https://obs.cn-north-4.myhuaweicloud.com ' } });
    fireEvent.change(screen.getByPlaceholderText('For example, hertzbeat'), { target: { value: ' data ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveObjectStore.mock.calls[0]?.[0]).toEqual({
      type: 'OBS',
      config: { accessKey: ' ak ', secretKey: ' sk ', bucketName: ' bucket ', endpoint: ' https://obs.cn-north-4.myhuaweicloud.com ', savePath: ' data ' }
    }));
  });

  it('keeps the OBS secret in runtime memory and request body only', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    renderObjectStorePage();

    const secret = await screen.findByPlaceholderText('OBS secret key');
    fireEvent.change(secret, { target: { value: 'runtime-only-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveObjectStore).toHaveBeenCalled());
    expect(screen.getByTestId('location')).not.toHaveTextContent('runtime-only-secret');
    expect(JSON.stringify(storageWrite.mock.calls)).not.toContain('runtime-only-secret');
    expect(JSON.stringify([...log.mock.calls, ...info.mock.calls, ...debug.mock.calls])).not.toContain('runtime-only-secret');
    storageWrite.mockRestore();
    log.mockRestore();
    info.mockRestore();
    debug.mockRestore();
  });
});

function renderObjectStorePage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/settings/storage/object-store']}>
          <App>
            <ObjectStorePage />
            <LocationProbe />
          </App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
