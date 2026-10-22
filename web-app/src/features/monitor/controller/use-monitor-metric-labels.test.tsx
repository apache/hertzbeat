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
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { monitorQueryKeys } from './monitor-query-keys';
import { useMonitorMetricLabels } from './use-monitor-metric-labels';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

const clients: QueryClient[] = [];

describe('monitor metric label queries', () => {
  beforeAll(async () => {
    await initializeI18n();
  });
  beforeEach(async () => {
    http.apiMessageGet.mockReset();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    clients.splice(0).forEach(client => client.clear());
  });

  it('shares one locale resource request and scopes aliases to the current application', async () => {
    http.apiMessageGet.mockResolvedValue({
      'monitor.app.website.metrics.summary': 'Summary',
      'monitor.app.redis.metrics.summary': 'Redis summary'
    });
    const view = renderHook(({ app }) => [useMonitorMetricLabels(app), useMonitorMetricLabels(app)], {
      initialProps: { app: 'website' },
      wrapper: wrapper()
    });
    await waitFor(() => expect(view.result.current[0]).toEqual({ summary: 'Summary' }));
    expect(view.result.current[1]).toEqual({ summary: 'Summary' });
    expect(http.apiMessageGet).toHaveBeenCalledTimes(1);
    view.rerender({ app: 'redis' });
    expect(view.result.current[0]).toEqual({ summary: 'Redis summary' });
  });

  it('clears old-language aliases while the next locale loads and ignores a late former response', async () => {
    let finishEnglish!: (resources: Record<string, string>) => void;
    let finishChinese!: (resources: Record<string, string>) => void;
    http.apiMessageGet.mockImplementation(
      (path: string) =>
        new Promise<Record<string, string>>(resolve => {
          if (path.endsWith('en-US')) finishEnglish = resolve;
          else finishChinese = resolve;
        })
    );
    const view = renderHook(() => useMonitorMetricLabels('website'), { wrapper: wrapper() });
    await waitFor(() => expect(http.apiMessageGet).toHaveBeenCalledTimes(1));
    const englishSignal = http.apiMessageGet.mock.calls[0]?.[1]?.signal as AbortSignal;
    await act(async () => {
      await loadLocale('zh-CN');
    });
    await waitFor(() => expect(http.apiMessageGet).toHaveBeenCalledTimes(2));
    expect(englishSignal.aborted).toBe(true);
    expect(view.result.current).toEqual({});
    await act(async () => {
      finishChinese({ 'monitor.app.website.metrics.summary': '\u6982\u8981' });
      await Promise.resolve();
    });
    await waitFor(() => expect(view.result.current).toEqual({ summary: '\u6982\u8981' }));
    await act(async () => {
      finishEnglish({ 'monitor.app.website.metrics.summary': 'Summary' });
      await Promise.resolve();
    });
    expect(view.result.current).toEqual({ summary: '\u6982\u8981' });
  });

  it('removes a ready translation immediately on a language change', async () => {
    http.apiMessageGet.mockResolvedValueOnce({ 'monitor.app.website.metrics.summary': 'Summary' });
    const view = renderHook(() => useMonitorMetricLabels('website'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current).toEqual({ summary: 'Summary' }));
    http.apiMessageGet.mockImplementation(() => new Promise(() => undefined));
    await act(async () => {
      await loadLocale('zh-CN');
    });
    expect(view.result.current).toEqual({});
  });

  it('keeps raw-name fallback after a resource error without retrying every card', async () => {
    http.apiMessageGet.mockRejectedValue(new Error('offline'));
    const client = createClient();
    const view = renderHook(() => useMonitorMetricLabels('website'), { wrapper: wrapper(client) });
    await waitFor(() => expect(client.getQueryState(monitorQueryKeys.i18nResources('en-US'))?.status).toBe('error'));
    expect(view.result.current).toEqual({});
    expect(http.apiMessageGet).toHaveBeenCalledTimes(1);
  });

  it('does not read template resources without a monitor application', () => {
    renderHook(() => useMonitorMetricLabels(undefined), { wrapper: wrapper() });
    expect(http.apiMessageGet).not.toHaveBeenCalled();
  });
});

function createClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return client;
}

function wrapper(client = createClient()) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    );
  };
}
