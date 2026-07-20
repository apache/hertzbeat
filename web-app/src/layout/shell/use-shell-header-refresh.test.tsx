/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { GlobalTimeProvider, RouteTimeProvider, type TimeOwnership } from '@/shared/time';

vi.mock('@refinedev/core', () => ({ useGo: () => vi.fn() }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { error: vi.fn() } }) } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US' } })
}));
vi.mock('@/core/auth/session-api', () => ({
  anonymousSession: { authenticated: false },
  logoutSession: vi.fn()
}));
vi.mock('@/core/auth/session-identity-context', () => ({ useSessionIdentityBoundary: () => vi.fn() }));
vi.mock('@/core/i18n/i18n', () => ({ loadLocale: vi.fn(), resolveLocale: () => 'en-US' }));
vi.mock('@/core/runtime-preferences', () => ({
  persistSystemPreferences: vi.fn(),
  readRuntimeLocale: () => 'en-US'
}));
vi.mock('@/core/runtime-theme-context', () => ({
  useRuntimeTheme: () => ({ theme: 'dark', setTheme: vi.fn() })
}));

import { useShellHeaderActionController } from './use-shell-header-action-controller';

describe('shell header refresh ownership', () => {
  it.each<TimeOwnership>(['global', 'route_owned'])(
    'fetches a %s time-owned query exactly once for one header refresh',
    async policy => {
      const harness = renderRefreshHarness(policy);

      await harness.waitForFetchCount(1);
      await harness.refresh();

      await harness.waitForIdle();
      expect(harness.fetchQuery).toHaveBeenCalledTimes(2);
    }
  );

  it.each<TimeOwnership>(['none', 'unknown'])(
    'still refreshes an active query once when the route time policy is %s',
    async policy => {
      const harness = renderRefreshHarness(policy);

      await harness.waitForFetchCount(1);
      await harness.refresh();

      await harness.waitForIdle();
      expect(harness.fetchQuery).toHaveBeenCalledTimes(2);
    }
  );
});

function renderRefreshHarness(policy: TimeOwnership) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
  });
  const fetchQuery = vi.fn().mockResolvedValue('ready');
  let refresh: (() => Promise<void>) | undefined;

  function Probe() {
    const actions = useShellHeaderActionController();
    const time = actions.sharedTime;
    refresh = actions.refresh;
    useQuery({
      queryKey: ['header-refresh-proof', policy, time.window?.from, time.window?.to, time.refreshRevision],
      queryFn: fetchQuery
    });
    return null;
  }

  const entry = policy === 'route_owned' ? '/?start=1000&end=2000' : '/';
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <GlobalTimeProvider>
          <RouteTimeProvider policy={policy}>
            <Probe />
          </RouteTimeProvider>
        </GlobalTimeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    fetchQuery,
    waitForFetchCount: (count: number) => waitFor(() => expect(fetchQuery).toHaveBeenCalledTimes(count)),
    refresh: async () => {
      if (!refresh) throw new Error('header refresh action is not mounted');
      await act(refresh);
    },
    waitForIdle: () => waitFor(() => expect(client.isFetching()).toBe(0))
  };
}
