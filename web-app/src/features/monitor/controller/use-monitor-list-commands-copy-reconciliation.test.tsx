/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { act, cleanup, renderHook, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const api = vi.hoisted(() => ({ mutateMonitors: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  mutateMonitors: api.mutateMonitors
}));

import { useMonitorListCommands } from './use-monitor-list-commands';

const page = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };

describe('failed monitor Copy reconciliation', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it.each([
    new ApiMessageError('legacy missing source', { code: 3, status: 200 }),
    new ApiMessageError('not found', { status: 404 })
  ])('rereads once after the retained Copy failure for %s', async error => {
    api.mutateMonitors.mockRejectedValue(error);
    const reread = vi.fn().mockResolvedValue(page);
    const selection = selectionController();
    const view = renderCommand('page=0', reread, selection);

    await act(() => view.result.current.run('copy', [7]));

    expect(api.mutateMonitors).toHaveBeenCalledOnce();
    expect(reread).toHaveBeenCalledOnce();
    expect(selection.remove).not.toHaveBeenCalled();
    expect(await screen.findByText(i18n.t('monitorActions.failed'))).toBeInTheDocument();
  });

  it.each([
    ['copy', new ApiMessageError('unrelated', { code: 2, status: 200 })],
    ['enable', new ApiMessageError('legacy code on another action', { code: 3, status: 200 })]
  ] as const)('does not reconcile an unrelated rejected %s command', async (action, error) => {
    api.mutateMonitors.mockRejectedValue(error);
    const reread = vi.fn();
    const view = renderCommand('page=0', reread, selectionController());

    await act(() => view.result.current.run(action, [7]));

    expect(reread).not.toHaveBeenCalled();
    expect(await screen.findByText(i18n.t('monitorActions.failed'))).toBeInTheDocument();
  });

  it('keeps the Copy failure when its canonical reread is unavailable', async () => {
    api.mutateMonitors.mockRejectedValue(new ApiMessageError('missing', { code: 3 }));
    const reread = vi.fn().mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    const view = renderCommand('page=0', reread, selectionController());

    await act(() => view.result.current.run('copy', [7]));

    expect(reread).toHaveBeenCalledOnce();
    expect(await screen.findByText(i18n.t('monitorActions.failed'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('monitorActions.success'))).not.toBeInTheDocument();
  });

  it.each(['source-change', 'unmount'] as const)(
    'does not reconcile a Copy failure after %s retires it',
    async mode => {
      const mutation = deferred<void>();
      api.mutateMonitors.mockReturnValue(mutation.promise);
      const reread = vi.fn();
      const selection = selectionController();
      const view = renderHook(
        ({ source }) => useMonitorListCommands(source, reread, selection, { canWrite: true, canDelete: true }),
        { initialProps: { source: 'page=0' }, wrapper: createCommandTestProviders() }
      );
      let operation!: Promise<void>;
      act(() => {
        operation = view.result.current.run('copy', [7]);
      });
      if (mode === 'source-change') view.rerender({ source: 'page=1' });
      else view.unmount();

      mutation.reject(new ApiMessageError('missing', { code: 3 }));
      await expect(operation).resolves.toBeUndefined();

      expect(reread).not.toHaveBeenCalled();
      expect(screen.queryByText(i18n.t('monitorActions.failed'))).not.toBeInTheDocument();
    }
  );
});

function renderCommand(
  source: string,
  reread: () => Promise<typeof page>,
  selection: ReturnType<typeof selectionController>
) {
  return renderHook(() => useMonitorListCommands(source, reread, selection, { canWrite: true, canDelete: true }), {
    wrapper: createCommandTestProviders()
  });
}

function selectionController() {
  return { remove: vi.fn(), validatedIds: vi.fn(() => [7]) };
}

function createCommandTestProviders() {
  const client = new QueryClient();
  return function CommandTestProviders({ children }: PropsWithChildren) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <App>{children}</App>
        </QueryClientProvider>
      </I18nextProvider>
    );
  };
}

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((_resolve, fail) => {
    reject = fail;
  });
  return { promise, reject };
}
