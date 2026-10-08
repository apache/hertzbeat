/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ApiMessageError } from '@/core/http/api-message';
import { useSession } from '@/core/auth/session-context';
import { loginPath, loginHref } from '@/core/auth/navigation';
import { AuthGate } from '@/core/auth/auth-gate';
import { SessionProvider } from '@/core/auth/session-provider';
import { sessionQueryKey, SessionRequestError, type UiSession } from '@/core/auth/session-api';
import { BasicLayout } from '@/layout/basic/basic-layout';
import { ExplorePage } from '@/features/explore';
import { SessionQueryRuntime } from './refine/session-query-runtime';

const api = vi.hoisted(() => ({ getSession: vi.fn(), refreshSession: vi.fn(), saveQueryRecord: vi.fn() }));
vi.mock('@/core/auth/session-api', async original => ({
  ...(await original<typeof import('@/core/auth/session-api')>()),
  getSession: api.getSession,
  getSessionWithRecovery: api.getSession,
  refreshSession: api.refreshSession
}));
vi.mock('@refinedev/core', async original => ({
  ...(await original<typeof import('@refinedev/core')>()),
  useResourceParams: () => ({
    action: 'list',
    resource: {
      meta: {
        shell: {
          capability: 'supported',
          labelKey: 'menu.explore',
          navigation: true,
          order: 1,
          timePolicy: 'route_owned'
        }
      }
    }
  })
}));
// Retain the real shell/context/time ownership; its unrelated status and navigation presentations need no APIs.
vi.mock('@/layout/shell/shell-header', () => ({ ShellHeader: () => <header>Shell</header> }));
vi.mock('@/layout/shell/shell-navigation', () => ({ ShellNavigation: () => <nav /> }));
vi.mock('@/features/explore/api/explore-saved-query-api', () => ({
  loadSavedQueries: () => Promise.resolve([]),
  saveQueryRecord: api.saveQueryRecord,
  deleteQueryRecord: vi.fn()
}));
vi.mock('@/features/explore/pages/explore-workspace-results', () => ({ ExploreWorkspaceResults: () => null }));
vi.mock('@/features/explore/api/explore-api', async original => ({
  ...(await original<typeof import('@/features/explore/api/explore-api')>()),
  loadMetricSignal: () => Promise.resolve({ kind: 'selection_required' })
}));
const identity: UiSession = {
  authenticated: true,
  username: 'operator-a',
  roles: ['ADMIN'],
  workspaceId: 'default',
  expiresAt: '2035-01-01T00:00:00.000Z'
};
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
beforeEach(() => {
  vi.clearAllMocks();
  api.getSession.mockResolvedValue(identity);
  api.saveQueryRecord.mockImplementation(record => Promise.resolve(record));
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach(router => router.dispose());
});

it('retains failed-write input across a transient foreground session read failure and same-session recovery', async () => {
  const router = mount();
  await failedEditor();
  const original = router.state.location;
  api.getSession.mockRejectedValueOnce(new SessionRequestError('unavailable'));
  fireEvent.focus(window);
  await waitFor(() => expect(api.getSession).toHaveBeenCalledOnce());
  expect(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') })).toHaveValue('Retained CPU');
  fireEvent.focus(window);
  await waitFor(() => expect(api.getSession).toHaveBeenCalledTimes(2));
  expect(screen.getByTestId('generation')).toHaveTextContent('0');
  expect(router.state.location).toEqual(original);
  expect(screen.getByRole('textbox', { name: i18n.t('exploreSaved.description') })).toHaveValue('Retained description');
  fireEvent.click(within(editorDialog()).getByRole('button', { name: /Save$/ }));
  await waitFor(() => expect(api.saveQueryRecord).toHaveBeenCalledTimes(2));
  expect(api.saveQueryRecord.mock.calls[1]![0]).toMatchObject(api.saveQueryRecord.mock.calls[0]![0]);
});

it('retains failed-write input when the same identity receives only a renewed expiry', async () => {
  const router = mount();
  await failedEditor();
  const original = router.state.location;
  const expiresAt = '2035-01-01T00:30:00.000Z';
  api.getSession.mockResolvedValueOnce({ ...identity, expiresAt });
  fireEvent.focus(window);
  await waitFor(() => expect(screen.getByTestId('session-expiry')).toHaveTextContent(expiresAt));
  expect(api.getSession).toHaveBeenCalledOnce();
  expect(screen.getByTestId('generation')).toHaveTextContent('0');
  expect(router.state.location).toEqual(original);
  expect(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') })).toHaveValue('Retained CPU');
  expect(screen.getByRole('textbox', { name: i18n.t('exploreSaved.description') })).toHaveValue('Retained description');
  expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('exploreSaved.writeFailed'));
  expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  expect(api.refreshSession).not.toHaveBeenCalled();
});

it.each([401, 403])('retires failed-write input after an authoritative session HTTP %s rejection', async status => {
  const router = mount();
  await failedEditor();
  const original = router.state.location;
  api.getSession.mockRejectedValueOnce(new SessionRequestError('error', { status }));
  fireEvent.focus(window);
  await waitFor(() => expect(screen.getByTestId('generation')).toHaveTextContent('1'));
  await waitFor(() => expect(router.state.location.pathname).toBe(loginPath));
  expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(
    loginHref(`${original.pathname}${original.search}${original.hash}`)
  );
  expect(screen.queryByRole('textbox', { name: i18n.t('exploreSaved.name') })).not.toBeInTheDocument();
  expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  expect(api.refreshSession).not.toHaveBeenCalled();
});

it.each([
  ['account', { ...identity, username: 'operator-b' }],
  ['workspace', { ...identity, workspaceId: 'workspace-b' }],
  ['roles', { ...identity, roles: ['USER'] }]
])('retires failed-write input when the authoritative session changes %s', async (_boundary, nextSession) => {
  const router = mount();
  await failedEditor();
  const original = router.state.location;
  api.getSession.mockResolvedValueOnce(nextSession);
  fireEvent.focus(window);
  await waitFor(() => expect(screen.getByTestId('generation')).toHaveTextContent('1'));
  expect(router.state.location).toEqual(original);
  expect(screen.queryByRole('textbox', { name: i18n.t('exploreSaved.name') })).not.toBeInTheDocument();
  const menu = await openQueryActions();
  expect(within(menu).getByRole('button', { name: i18n.t('exploreSaved.save') })).toBeEnabled();
  expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  expect(api.refreshSession).not.toHaveBeenCalled();
});

function SessionLifetimeProbe() {
  return <output data-testid="session-expiry">{useSession().session?.expiresAt ?? 'none'}</output>;
}

it.each([401, 403, 500])(
  'renders localized save feedback for HTTP%s while retaining draft and cancel',
  async status => {
    mount();
    const key = status === 500 ? 'writeFailed' : 'savePermission';
    await failedEditor(new ApiMessageError('Synthetic private server text', { status }), key);
    expect(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') })).toHaveValue('Retained CPU');
    expect(screen.getByRole('textbox', { name: i18n.t('exploreSaved.description') })).toHaveValue(
      'Retained description'
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Synthetic private server text');
    expect(screen.getByTestId('generation')).toHaveTextContent('0');
    expect(api.saveQueryRecord).toHaveBeenCalledOnce();
    expect(api.refreshSession).not.toHaveBeenCalled();
    const dialog = editorDialog();
    const cancel = within(dialog).getByRole('button', { name: i18n.t('common.cancel') });
    await waitFor(() => expect(cancel).toBeEnabled());
    fireEvent.click(cancel);
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: i18n.t('exploreSaved.name') })).not.toBeInTheDocument()
    );
  }
);

async function failedEditor(
  failure: Error = new Error('Connection refused'),
  errorKey: 'writeFailed' | 'savePermission' = 'writeFailed'
) {
  const menu = await openQueryActions();
  fireEvent.click(within(menu).getByRole('button', { name: i18n.t('exploreSaved.save') }));
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') }), {
    target: { value: 'Retained CPU' }
  });
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('exploreSaved.description') }), {
    target: { value: 'Retained description' }
  });
  api.saveQueryRecord.mockRejectedValueOnce(failure);
  fireEvent.click(within(editorDialog()).getByRole('button', { name: /Save$/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t(`exploreSaved.${errorKey}`));
}
function editorDialog() {
  return screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') }).closest('[role="dialog"]') as HTMLElement;
}
function mount() {
  let first = true;
  const createQueryClient = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity } }
    });
    if (first) {
      client.setQueryData(sessionQueryKey, identity);
      first = false;
    }
    return client;
  };
  const router = createMemoryRouter(
    [
      {
        element: (
          <SessionQueryRuntime createQueryClient={createQueryClient}>
            {runtime => (
              <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
                <SessionProvider>
                  <output data-testid="generation">{runtime.generation}</output>
                  <SessionLifetimeProbe />
                  <Outlet />
                </SessionProvider>
              </QueryClientProvider>
            )}
          </SessionQueryRuntime>
        ),
        children: [
          { path: loginPath, element: <div>Login boundary</div> },
          {
            element: (
              <AuthGate
                failureState={() => <div>Session unavailable</div>}
                loadingState={<div>Checking session</div>}
              />
            ),
            children: [{ element: <BasicLayout />, children: [{ path: '/explore', element: <ExplorePage /> }] }]
          }
        ]
      }
    ],
    { initialEntries: ['/explore?signal=metrics&query=cpu&timeRange=last-30m'] }
  );
  routers.push(router);
  render(
    <I18nextProvider i18n={i18n}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <RouterProvider router={router} />
        </App>
      </ConfigProvider>
    </I18nextProvider>
  );
  return router;
}

async function openQueryActions() {
  const trigger = document.querySelector('[data-signal-view-trigger]');
  expect(trigger?.tagName).toBe('BUTTON');
  fireEvent.click(trigger!);
  return screen.findByRole('dialog', { name: i18n.t('exploreSaved.queryActions') });
}
