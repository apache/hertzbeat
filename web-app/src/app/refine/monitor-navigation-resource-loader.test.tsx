/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MonitorApp } from '@/features/monitor/navigation';

import { MonitorNavigationResourceLoader } from './monitor-navigation-resource-loader';

const runtime = vi.hoisted(
  (): {
    locale: string;
    load: ReturnType<typeof vi.fn>;
    session: { loading: boolean; session?: { authenticated: boolean } };
  } => ({
    locale: 'en-US',
    load: vi.fn(),
    session: {
      loading: false,
      session: { authenticated: false }
    }
  })
);

vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ ...runtime.session, retry: vi.fn() })
}));
vi.mock('@/features/monitor/navigation', () => ({
  loadMonitorNavigationApps: runtime.load,
  monitorNavigationQueryKeys: {
    locale: (locale: string) => ['shell', 'monitor-navigation', locale]
  }
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { resolvedLanguage: runtime.locale } })
}));

describe('MonitorNavigationResourceLoader', () => {
  beforeEach(() => {
    runtime.locale = 'en-US';
    runtime.load.mockReset();
    runtime.session = { loading: false, session: { authenticated: false } };
  });
  afterEach(cleanup);

  it('never requests monitor applications before an authenticated session exists', async () => {
    const onChange = vi.fn();
    renderLoader(onChange);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]));
    expect(runtime.load).not.toHaveBeenCalled();
  });

  it('publishes localized applications and clears prior-language labels while the locale changes', async () => {
    runtime.session = { loading: false, session: { authenticated: true } };
    runtime.load.mockResolvedValueOnce([{ category: 'db', value: 'mysql', label: 'MySQL', hide: false }]);
    const translated = deferred<Array<{ category: string; value: string; label: string; hide: boolean }>>();
    const onChange = vi.fn();
    const view = renderLoader(onChange);

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([{ category: 'db', value: 'mysql', label: 'MySQL', hide: false }])
    );

    runtime.locale = 'pt-BR';
    runtime.load.mockReturnValueOnce(translated.promise);
    view.rerender(loader(onChange, view.client));
    await waitFor(() => expect(runtime.load).toHaveBeenLastCalledWith('pt-BR', expect.any(AbortSignal)));
    expect(onChange).toHaveBeenLastCalledWith([]);

    await act(async () => {
      translated.resolve([{ category: 'db', value: 'mysql', label: 'Banco de dados', hide: false }]);
      await translated.promise;
    });
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([
        { category: 'db', value: 'mysql', label: 'Banco de dados', hide: false }
      ])
    );
  });

  it('replays a cached authenticated catalog without clearing resources during a remount', async () => {
    runtime.session = { loading: false, session: { authenticated: true } };
    const apps = [{ category: 'db', value: 'mysql', label: 'MySQL', hide: false }];
    runtime.load.mockResolvedValue(apps);
    const onChange = vi.fn();
    const view = renderLoader(onChange);

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(apps));
    onChange.mockClear();

    view.unmount();
    render(loader(onChange, view.client));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(apps));
    expect(onChange).not.toHaveBeenCalledWith([]);
  });
});

function renderLoader(onChange: (apps: readonly MonitorApp[]) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(loader(onChange, client));
  return { ...view, client };
}

function loader(onChange: (apps: readonly MonitorApp[]) => void, client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <MonitorNavigationResourceLoader onChange={onChange} />
    </QueryClientProvider>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(owner => {
    resolve = owner;
  });
  return { promise, resolve };
}
