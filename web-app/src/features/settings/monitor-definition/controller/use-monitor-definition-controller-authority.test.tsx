/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uiSessionSchema } from '@/core/auth/session-contract';

import { MonitorDefinitionRequestError } from '../api/monitor-definition-api';

import {
  api,
  auth,
  deferred,
  detail,
  item,
  renderController,
  renderControllerAt,
  resetMonitorDefinitionControllerFixture,
  revision,
  route,
  testClient,
  updateWorkspace
} from './use-monitor-definition-controller-test-support';

describe('useMonitorDefinitionController authority', () => {
  beforeEach(resetMonitorDefinitionControllerFixture);

  it('retains a read-only view across ADMIN loss and does not resurrect retired edit state after re-upgrade', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    act(() => view.result.current.actions.setSearch('mysql'));
    await act(() => view.result.current.actions.openView('mysql'));

    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.canWrite).toBe(false));
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
    expect(view.result.current.search).toBe('mysql');
    expect(view.result.current.items).toEqual([item]);

    auth.roles = ['ADMIN'];
    view.rerender();
    await waitFor(() => expect(view.result.current.canWrite).toBe(true));
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });

    act(() => view.result.current.actions.openCreate());
    act(() => view.result.current.actions.setDefinition('app: custom'));
    act(() => view.result.current.actions.requestDelete(item));
    const staleOpenCreate = view.result.current.actions.openCreate;
    const staleOpenEdit = view.result.current.actions.openEdit;
    const staleValidate = view.result.current.actions.validate;
    const staleSave = view.result.current.actions.save;
    const staleDelete = view.result.current.actions.requestDelete;
    const staleConfirmDelete = view.result.current.actions.confirmDelete;
    const detailCalls = api.detail.mock.calls.length;
    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.workspace).toBeNull());

    auth.roles = ['ADMIN'];
    view.rerender();
    await waitFor(() => expect(view.result.current.canWrite).toBe(true));
    staleOpenCreate();
    await act(() => staleOpenEdit('mysql'));
    await act(() => staleValidate());
    await act(() => staleSave());
    act(() => staleDelete(item));
    await act(() => staleConfirmDelete());
    expect(api.detail).toHaveBeenCalledTimes(detailCalls);
    expect(api.validate).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
    expect(view.result.current.workspace).toBeNull();
    expect(view.result.current.deleteTarget).toBeNull();
  });

  it('retains read-only loading and retryable error workspaces across ADMIN loss', async () => {
    const loading = deferred<typeof detail>();
    api.detail.mockReturnValueOnce(loading.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    let opening!: Promise<void>;
    act(() => {
      opening = view.result.current.actions.openView('mysql');
    });
    expect(view.result.current.workspace).toEqual({ kind: 'loading', mode: 'view', app: 'mysql' });

    auth.roles = ['USER'];
    view.rerender();
    loading.resolve(detail);
    await act(async () => opening);
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });

    api.detail.mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable')).mockResolvedValueOnce(detail);
    await act(() => view.result.current.actions.openView('mysql'));
    expect(view.result.current.workspace).toEqual({
      kind: 'error',
      mode: 'view',
      app: 'mysql',
      failure: 'unavailable'
    });
    await act(() => view.result.current.actions.retryWorkspace());
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
  });

  it('retires pending edit loading and validation when ADMIN authority is lost', async () => {
    const edit = deferred<typeof detail>();
    api.detail.mockReturnValueOnce(edit.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    let opening!: Promise<void>;
    act(() => {
      opening = view.result.current.actions.openEdit('mysql');
    });
    expect(view.result.current.workspace).toEqual({ kind: 'loading', mode: 'edit', app: 'mysql' });

    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    edit.resolve(detail);
    await act(async () => opening);
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });

    auth.roles = ['ADMIN'];
    view.rerender();
    await waitFor(() => expect(view.result.current.canWrite).toBe(true));
    const validation = deferred<{ schemaVersion: 1; valid: true; app: string; origin: 'custom' }>();
    api.validate.mockReturnValueOnce(validation.promise);
    act(() => view.result.current.actions.openCreate());
    act(() => view.result.current.actions.setDefinition('app: custom'));
    let validating!: Promise<void>;
    act(() => {
      validating = view.result.current.actions.validate();
    });
    await waitFor(() => expect(api.validate).toHaveBeenCalledOnce());

    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.workspace).toBeNull());
    validation.resolve({ schemaVersion: 1, valid: true, app: 'custom', origin: 'custom' });
    await act(async () => validating);
    expect(view.result.current.workspace).toBeNull();
  });

  it('retires an edit recovery state and stale refresh command across authority loss and re-upgrade', async () => {
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('revision-conflict'));
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: local'));
    await act(() => view.result.current.actions.save());
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', failure: 'revision-conflict' });
    const staleRefresh = view.result.current.actions.refreshAuthoritativeDraft;
    const detailCalls = api.detail.mock.calls.length;

    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    const restoredDetailCalls = api.detail.mock.calls.length;

    auth.roles = ['ADMIN'];
    view.rerender();
    await waitFor(() => expect(view.result.current.canWrite).toBe(true));
    await act(() => staleRefresh());
    expect(restoredDetailCalls).toBe(detailCalls + 1);
    expect(api.detail).toHaveBeenCalledTimes(restoredDetailCalls);
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
  });

  it('does not let view or edit opens silently retire a pending save', async () => {
    const write = deferred<typeof detail>();
    api.create.mockReturnValue(write.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    act(() => view.result.current.actions.openCreate());
    act(() => view.result.current.actions.setDefinition('app: custom'));
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.actions.save();
    });
    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    const detailCalls = api.detail.mock.calls.length;

    await act(() => view.result.current.actions.openView('mysql'));
    await act(() => view.result.current.actions.openEdit('mysql'));

    expect(api.detail).toHaveBeenCalledTimes(detailCalls);
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', pending: 'save' });
    write.resolve(detail);
    await act(async () => save);
    expect(view.result.current.workspace).toEqual(updateWorkspace(detail));
  });

  it.each([
    ['view', 'resolve'],
    ['view', 'reject'],
    ['edit', 'resolve'],
    ['edit', 'reject']
  ] as const)('closes a pending %s detail workspace and ignores its late %s', async (mode, completion) => {
    const loading = deferred<typeof detail>();
    api.detail.mockReturnValue(loading.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    let opening!: Promise<void>;
    act(() => {
      opening =
        mode === 'view' ? view.result.current.actions.openView('mysql') : view.result.current.actions.openEdit('mysql');
    });
    expect(view.result.current.workspace).toEqual({ kind: 'loading', mode, app: 'mysql' });

    act(() => view.result.current.actions.closeWorkspace());
    expect(view.result.current.workspace).toBeNull();
    if (completion === 'resolve') loading.resolve(detail);
    else loading.reject(new MonitorDefinitionRequestError('unavailable'));
    await act(async () => opening);

    expect(view.result.current.workspace).toBeNull();
  });

  it.each(['save', 'delete'] as const)('retires an in-flight %s on unmount', async operation => {
    const completion = deferred<unknown>();
    if (operation === 'save') api.create.mockReturnValue(completion.promise);
    else api.remove.mockReturnValue(completion.promise);
    const client = testClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const view = renderController(client);
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    invalidate.mockClear();
    let command!: Promise<void>;
    if (operation === 'save') {
      act(() => view.result.current.actions.openCreate());
      act(() => view.result.current.actions.setDefinition('app: custom'));
      act(() => {
        command = view.result.current.actions.save();
      });
      await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    } else {
      act(() => view.result.current.actions.requestDelete(item));
      act(() => {
        command = view.result.current.actions.confirmDelete();
      });
      await waitFor(() => expect(api.remove).toHaveBeenCalledOnce());
    }
    const signal = operation === 'save' ? api.create.mock.calls[0]?.[2] : api.remove.mock.calls[0]?.[2];

    view.unmount();
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(true);
    completion.resolve(
      operation === 'save' ? detail : { schemaVersion: 1, app: 'mysql', disposition: 'builtin_restored' }
    );
    await command;

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('reports both delete dispositions and enforces local ADMIN write admission', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.requestDelete(item));
    await act(() => result.current.actions.confirmDelete());
    expect(api.remove).toHaveBeenCalledWith('mysql', revision, expect.any(AbortSignal));
    expect(result.current.notice).toBe('builtin_restored');

    auth.roles = ['USER'];
    const reader = renderController();
    await waitFor(() => expect(reader.result.current.listState.kind).toBe('ready'));
    expect(reader.result.current.canWrite).toBe(false);
    act(() => reader.result.current.actions.openCreate());
    expect(reader.result.current.workspace).toBeNull();
  });

  it('admits the real lowercase admin role after the shared session boundary normalizes it', async () => {
    auth.roles = uiSessionSchema.parse({
      authenticated: true,
      username: 'admin',
      roles: [' admin '],
      workspaceId: 'default',
      expiresAt: null
    }).roles;

    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    expect(result.current.canWrite).toBe(true);
    act(() => result.current.actions.openCreate());
    expect(result.current.workspace).toMatchObject({ kind: 'edit', draft: { mode: 'create' } });
  });

  it.each([['ADMIN'], ['USER']])(
    'opens an initial app deep link in the permission-appropriate workspace without waiting for catalog for %s',
    async role => {
      auth.roles = [role];
      api.catalog.mockReturnValue(new Promise(() => {}));
      const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql', true);

      await waitFor(() =>
        expect(view.result.current.workspace).toEqual(
          role === 'ADMIN' ? updateWorkspace(detail) : { kind: 'view', detail }
        )
      );

      expect(api.detail).toHaveBeenCalledTimes(1);
      expect(route.search).toBe('?scope=all&app=mysql');
    }
  );

  it.each(['not-found', 'app-invalid'] as const)('keeps a legal app and retryable %s route error', async failure => {
    api.detail.mockRejectedValueOnce(new MonitorDefinitionRequestError(failure)).mockResolvedValueOnce(detail);
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');

    await waitFor(() =>
      expect(view.result.current.workspace).toEqual({ kind: 'error', mode: 'edit', app: 'mysql', failure })
    );

    expect(route.search).toBe('?scope=all&app=mysql');
    expect(api.detail).toHaveBeenCalledOnce();
    await act(() => view.result.current.actions.retryWorkspace());
    expect(view.result.current.workspace).toEqual(updateWorkspace(detail));
    expect(route.search).toBe('?scope=all&app=mysql');
  });
});
