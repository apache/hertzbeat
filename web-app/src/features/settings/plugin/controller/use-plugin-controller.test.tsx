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

const api = vi.hoisted(() => ({
  delete: vi.fn(),
  load: vi.fn(),
  loadParams: vi.fn(),
  saveParams: vi.fn(),
  toggle: vi.fn(),
  upload: vi.fn()
}));
const auth = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
vi.mock('../api/plugin-api', async () => ({
  ...(await vi.importActual<typeof import('../api/plugin-api')>('../api/plugin-api')),
  deletePlugins: api.delete,
  loadPlugins: api.load,
  loadPluginParams: api.loadParams,
  savePluginParams: api.saveParams,
  updatePluginStatus: api.toggle,
  uploadPlugin: api.upload
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: auth.roles } })
}));

import { usePluginController } from './use-plugin-controller';
import { PluginRequestError } from '../api/plugin-api';

const records = [plugin(11, 'audit', true), plugin(17, 'notify', false)];

describe('usePluginController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['ADMIN'];
    api.load.mockResolvedValue(page(records, 0, 2));
    api.upload.mockResolvedValue(null);
    api.loadParams.mockResolvedValue({ paramDefines: [], pluginParams: [] });
    api.saveParams.mockResolvedValue(true);
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

  it.each([
    ['invalid', 'invalid'],
    ['permission', 'permission'],
    ['unavailable', 'unavailable'],
    ['error', 'error']
  ] as const)('keeps the %s list failure distinct', async (failure, state) => {
    api.load.mockRejectedValue(new PluginRequestError(failure));
    const { result } = renderController();

    await waitFor(() => expect(result.current.listState.kind).toBe(state));
  });

  it('keeps the jar only in the upload draft, validates it, cancels cleanly, and denies non-admin writes', async () => {
    api.load
      .mockResolvedValueOnce(page(records, 0, 2))
      .mockResolvedValueOnce(page([plugin(11, 'audit', false), records[1]!], 0, 2))
      .mockResolvedValueOnce(page([], 0, 0))
      .mockResolvedValueOnce(page([plugin(19, 'new-plugin', false)], 0, 1));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    const jar = new File(['plugin'], 'audit.jar', { type: 'application/java-archive' });

    await act(() => result.current.actions.toggleStatus(records[0]!));
    expect(result.current.notice).toBe('updated');
    act(() => result.current.actions.openUpload());
    expect(result.current.notice).toBeNull();
    act(() => result.current.actions.setUploadName('new-plugin'));
    act(() => result.current.actions.setUploadEnabled(false));
    act(() => result.current.actions.setUploadFile(jar));
    await act(() => result.current.actions.saveUpload());
    expect(api.upload).toHaveBeenCalledWith({ name: 'new-plugin', jarFile: jar, enableStatus: false });
    expect(result.current.upload).toBeNull();

    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadFile(jar));
    act(() => result.current.actions.cancelUpload());
    expect(result.current.upload).toBeNull();

    auth.roles = ['USER'];
    const reader = renderController();
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
    await waitFor(() => expect(api.load.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('confirms batch delete and corrects a now-empty non-first page', async () => {
    let pageTwoReads = 0;
    api.load.mockImplementation(query => {
      if (query.pageIndex !== 2) return Promise.resolve(page([plugin(9, 'previous', true)], 1, 16));
      pageTwoReads += 1;
      return Promise.resolve(page(pageTwoReads === 1 ? records : [], 2, pageTwoReads === 1 ? 18 : 16));
    });
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

  it('clears a failed upload on cancel and keeps it out of a later delete', async () => {
    api.upload.mockRejectedValueOnce(new Error('private upload detail'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    const jar = new File(['plugin'], 'audit.jar', { type: 'application/java-archive' });

    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadName('broken-plugin'));
    act(() => result.current.actions.setUploadFile(jar));
    await act(() => result.current.actions.saveUpload());
    expect(result.current.uploadFailure).toBe('error');

    act(() => result.current.actions.cancelUpload());
    expect(result.current.uploadFailure).toBeNull();
    act(() => result.current.actions.requestDeleteOne(records[0]!));
    expect(result.current.deleteTarget).toMatchObject({ ids: [11], mode: 'single' });
    expect(result.current.mutationFailure).toBeNull();
  });

  it('clears an old success notice when the next mutation starts and fails', async () => {
    api.load
      .mockResolvedValueOnce(page(records, 0, 2))
      .mockResolvedValueOnce(page([plugin(11, 'audit', false), records[1]!], 0, 2));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(() => result.current.actions.toggleStatus(records[0]!));
    expect(result.current.notice).toBe('updated');

    api.toggle.mockRejectedValueOnce(new Error('private update detail'));
    await act(() => result.current.actions.toggleStatus(records[0]!));

    expect(result.current.notice).toBeNull();
    expect(result.current.mutationFailure).toBe('error');
  });

  it('proves an uncertain status outcome by canonical reread without repeating the command', async () => {
    api.toggle.mockRejectedValue(new PluginRequestError('unavailable', 'uncertain'));
    api.load
      .mockResolvedValueOnce(page(records, 0, 2))
      .mockResolvedValueOnce(page([plugin(11, 'audit', false), records[1]!], 0, 2));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    await act(() => result.current.actions.toggleStatus(records[0]!));

    expect(api.toggle).toHaveBeenCalledTimes(1);
    expect(api.load).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBe('updated');
    expect(result.current.mutationFailure).toBeNull();
  });

  it('proves an uncertain delete by canonical reread without repeating the command', async () => {
    api.delete.mockRejectedValue(new PluginRequestError('unavailable', 'uncertain'));
    api.load.mockResolvedValueOnce(page(records, 0, 2)).mockResolvedValueOnce(page([records[1]!], 0, 1));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.requestDeleteOne(records[0]!));
    await act(() => result.current.actions.confirmDelete());

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.load).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBe('deleted');
    expect(result.current.mutationFailure).toBeNull();
  });

  it('refuses an upload name that already exists before sending the Jar', async () => {
    api.load.mockResolvedValueOnce(page(records, 0, 2)).mockResolvedValueOnce(page([records[0]!], 0, 1));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    const jar = new File(['plugin'], 'audit.jar', { type: 'application/java-archive' });

    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadName('audit'));
    act(() => result.current.actions.setUploadFile(jar));
    await act(() => result.current.actions.saveUpload());

    expect(api.upload).not.toHaveBeenCalled();
    expect(result.current.uploadFailure).toBe('conflict');
  });

  it('proves an uncertain upload only when a new canonical identity appears', async () => {
    api.upload.mockRejectedValue(new PluginRequestError('unavailable', 'uncertain'));
    api.load
      .mockResolvedValueOnce(page(records, 0, 2))
      .mockResolvedValueOnce(page([], 0, 0))
      .mockResolvedValueOnce(page([plugin(19, 'new-plugin', true)], 0, 1));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    const jar = new File(['plugin'], 'new-plugin.jar', { type: 'application/java-archive' });

    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadName('new-plugin'));
    act(() => result.current.actions.setUploadFile(jar));
    await act(() => result.current.actions.saveUpload());

    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.load).toHaveBeenCalledTimes(4);
    expect(api.load.mock.calls.filter(([query]) => query.search === 'new-plugin')).toHaveLength(2);
    expect(result.current.upload).toBeNull();
    expect(result.current.uploadFailure).toBeNull();
  });

  it('does not claim an uncertain upload from an incomplete preflight page', async () => {
    api.upload.mockRejectedValue(new PluginRequestError('unavailable', 'uncertain'));
    api.load.mockResolvedValueOnce(page(records, 0, 2)).mockResolvedValueOnce(page(records, 0, 51));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    const jar = new File(['plugin'], 'new-plugin.jar', { type: 'application/java-archive' });

    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadName('new-plugin'));
    act(() => result.current.actions.setUploadFile(jar));
    await act(() => result.current.actions.saveUpload());

    expect(api.upload).toHaveBeenCalledOnce();
    expect(api.load.mock.calls.filter(([query]) => query.search === 'new-plugin')).toHaveLength(1);
    expect(result.current.upload).not.toBeNull();
    expect(result.current.uploadFailure).toBe('unavailable');
  });

  it('does not reread a definitely rejected command', async () => {
    api.toggle.mockRejectedValue(new PluginRequestError('permission', 'rejected'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    await act(() => result.current.actions.toggleStatus(records[0]!));

    expect(api.toggle).toHaveBeenCalledTimes(1);
    expect(api.load).toHaveBeenCalledTimes(1);
    expect(result.current.mutationFailure).toBe('permission');
  });

  it('retires in-memory drafts and ignores late writes after role loss', async () => {
    const pending = deferred<null>();
    api.upload.mockReturnValue(pending.promise);
    const { result, rerender } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    const jar = new File(['plugin'], 'new-plugin.jar', { type: 'application/java-archive' });
    act(() => result.current.actions.openUpload());
    act(() => result.current.actions.setUploadName('new-plugin'));
    act(() => result.current.actions.setUploadFile(jar));
    let saving!: Promise<void>;
    const retainedToggle = result.current.actions.toggleStatus;
    act(() => {
      saving = result.current.actions.saveUpload();
    });
    await waitFor(() => expect(api.upload).toHaveBeenCalledOnce());
    const proofReadsBeforeRoleLoss = api.load.mock.calls.filter(([query]) => query.search === 'new-plugin').length;

    auth.roles = ['USER'];
    rerender();
    await waitFor(() => expect(result.current.canWrite).toBe(false));
    expect(result.current.listState.kind).toBe('permission');
    await waitFor(() => expect(result.current.upload).toBeNull());
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(() => retainedToggle(records[0]!));
    expect(api.toggle).not.toHaveBeenCalled();
    pending.resolve(null);
    await act(() => saving);

    expect(api.load.mock.calls.filter(([query]) => query.search === 'new-plugin')).toHaveLength(
      proofReadsBeforeRoleLoss
    );
    expect(result.current.uploadFailure).toBeNull();
  });
});

function renderController(path = '/settings/plugins') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
  });
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
