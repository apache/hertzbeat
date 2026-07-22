/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ delete: vi.fn(), load: vi.fn(), toggle: vi.fn(), upload: vi.fn() }));
const auth = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
vi.mock('../api/plugin-api', async () => ({
  ...(await vi.importActual<typeof import('../api/plugin-api')>('../api/plugin-api')),
  deletePlugins: api.delete,
  loadPlugins: api.load,
  updatePluginStatus: api.toggle,
  uploadPlugin: api.upload
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: auth.roles } })
}));

import { usePluginController } from './use-plugin-controller';

const records = [plugin(11, 'audit', true), plugin(17, 'notify', false)];

describe('usePluginController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['ADMIN'];
    api.load.mockResolvedValue(page(records, 0, 2));
    api.upload.mockResolvedValue(null);
    api.toggle.mockResolvedValue(null);
    api.delete.mockResolvedValue(null);
  });

  it('drives server search and zero-based pagination from canonical URL state', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.setSearchDraft(' audit '));
    act(() => result.current.actions.submitSearch());
    await waitFor(() =>
      expect(api.load).toHaveBeenLastCalledWith({ search: 'audit', pageIndex: 0, pageSize: 8 }, expect.anything())
    );
    act(() => result.current.actions.setPage(1, 20));
    await waitFor(() =>
      expect(api.load).toHaveBeenLastCalledWith({ search: 'audit', pageIndex: 1, pageSize: 20 }, expect.anything())
    );
  });

  it('keeps the jar only in the upload draft, validates it, cancels cleanly, and denies non-admin writes', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    const jar = new File(['plugin'], 'audit.jar', { type: 'application/java-archive' });

    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadName('audit'));
    act(() => result.current.actions.setUploadFile(jar));
    await act(() => result.current.actions.saveUpload());
    expect(api.upload).toHaveBeenCalledWith({ name: 'audit', jarFile: jar, enableStatus: true });
    expect(result.current.upload).toBeNull();

    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadFile(jar));
    act(() => result.current.actions.cancelUpload());
    expect(result.current.upload).toBeNull();

    auth.roles = ['USER'];
    const reader = renderController();
    await waitFor(() => expect(reader.result.current.listState.kind).toBe('ready'));
    act(() => reader.result.current.actions.openUpload());
    expect(reader.result.current.canWrite).toBe(false);
    expect(reader.result.current.upload).toBeNull();
  });

  it('serializes status writes without optimistic double flipping', async () => {
    const pending = deferred<void>();
    api.toggle.mockReturnValue(pending.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    let first!: Promise<void>;
    act(() => {
      first = result.current.actions.toggleStatus(records[0]!);
      void result.current.actions.toggleStatus(records[0]!);
    });
    expect(api.toggle).toHaveBeenCalledTimes(1);
    expect(result.current.listState.kind).toBe('ready');
    if (result.current.listState.kind === 'ready') expect(result.current.listState.records[0]?.enableStatus).toBe(true);
    pending.resolve();
    await act(() => first);
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(2));
  });

  it('confirms batch delete and corrects a now-empty non-first page', async () => {
    api.load.mockImplementation(query =>
      Promise.resolve(query.pageIndex === 2 ? page(records, 2, 18) : page([plugin(9, 'previous', true)], 1, 16))
    );
    const { result } = renderController('/settings/plugins?pageIndex=2&pageSize=8');
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.setSelected([11, 17]));
    act(() => result.current.actions.requestDeleteSelected());
    expect(result.current.deleteTarget).toMatchObject({ ids: [11, 17], mode: 'batch' });
    await act(() => result.current.actions.confirmDelete());

    expect(api.delete).toHaveBeenCalledWith([11, 17]);
    await waitFor(() =>
      expect(api.load).toHaveBeenLastCalledWith({ search: '', pageIndex: 1, pageSize: 8 }, expect.anything())
    );
  });

  it('does not overwrite newer navigation when a delete finishes', async () => {
    const pending = deferred<null>();
    api.delete.mockReturnValue(pending.promise);
    api.load.mockImplementation(query =>
      Promise.resolve(query.pageIndex === 2 ? page(records, 2, 18) : page([plugin(3, 'current', true)], 0, 1))
    );
    const { result } = renderController('/settings/plugins?pageIndex=2&pageSize=8');
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.requestDeleteOne(records[0]!));
    let deletion!: Promise<void>;
    act(() => {
      deletion = result.current.actions.confirmDelete();
    });
    act(() => result.current.actions.setPage(0, 8));
    await waitFor(() => expect(result.current.query.pageIndex).toBe(0));
    pending.resolve(null);
    await act(() => deletion);

    expect(result.current.query.pageIndex).toBe(0);
  });
});

function renderController(path = '/settings/plugins') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
  return renderHook(() => usePluginController(), { wrapper });
}

function plugin(id: number, name: string, enableStatus: boolean) {
  return { id, name, enableStatus };
}

function page(content: ReturnType<typeof plugin>[], number: number, totalElements: number) {
  return { content, number, size: 8, totalElements, totalPages: Math.ceil(totalElements / 8) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
