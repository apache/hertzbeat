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
import { renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applicationRoutePaths } from '@/shared/navigation/app-paths';

const runtime = vi.hoisted(() => ({
  navigate: vi.fn(),
  redirect: null as string | null,
  replaceIdentity: vi.fn(),
  session: {
    loading: false,
    retry: vi.fn(),
    session: { authenticated: true },
    unavailable: false
  }
}));

vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => runtime.navigate,
  useSearchParams: () => [new URLSearchParams(runtime.redirect ? { redirect: runtime.redirect } : {})]
}));
vi.mock('@/core/auth/session-context', () => ({ useSession: () => runtime.session }));
vi.mock('@/core/auth/session-identity-context', () => ({
  useSessionIdentityBoundary: () => runtime.replaceIdentity
}));

import { useLoginController } from './use-login-controller';

describe('login controller navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.redirect = null;
    runtime.session.loading = false;
    runtime.session.session.authenticated = true;
    runtime.session.unavailable = false;
  });

  it('navigates once per stable authenticated target under Strict Mode and admits a real target change', async () => {
    runtime.redirect = '/explore?signal=logs';
    const hook = renderLoginController();

    await waitFor(() => expect(runtime.navigate).toHaveBeenCalledWith('/explore?signal=logs', { replace: true }));
    expect(runtime.navigate).toHaveBeenCalledTimes(1);

    hook.rerender();
    expect(runtime.navigate).toHaveBeenCalledTimes(1);

    runtime.session.loading = true;
    hook.rerender();
    runtime.session.loading = false;
    hook.rerender();
    expect(runtime.navigate).toHaveBeenCalledTimes(1);

    runtime.redirect = '/alerts';
    hook.rerender();
    await waitFor(() => expect(runtime.navigate).toHaveBeenCalledTimes(2));
    expect(runtime.navigate).toHaveBeenLastCalledWith('/alerts', { replace: true });
  });

  it('falls back to the canonical dashboard for an unsafe redirect', async () => {
    runtime.redirect = 'https://outside.example/private';
    renderLoginController();

    await waitFor(() =>
      expect(runtime.navigate).toHaveBeenCalledWith(applicationRoutePaths.dashboard, { replace: true })
    );
    expect(runtime.navigate).toHaveBeenCalledTimes(1);
  });
});

function renderLoginController() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </StrictMode>
  );
  return renderHook(() => useLoginController(), { wrapper });
}
