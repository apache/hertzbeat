/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, useLayoutEffect, type PropsWithChildren } from 'react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uiSessionSchema } from '@/core/auth/session-contract';

import { MonitorDefinitionRequestError } from '../api/monitor-definition-api';

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  create: vi.fn(),
  detail: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  validate: vi.fn()
}));
const auth = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
vi.mock('../api/monitor-definition-api', async () => ({
  ...(await vi.importActual<typeof import('../api/monitor-definition-api')>('../api/monitor-definition-api')),
  createMonitorDefinition: api.create,
  deleteMonitorDefinition: api.remove,
  loadMonitorDefinitionCatalog: api.catalog,
  loadMonitorDefinitionDetail: api.detail,
  updateMonitorDefinition: api.update,
  validateMonitorDefinition: api.validate
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: auth.roles } })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: 'en-US' } }) }));

import { useMonitorDefinitionController } from './use-monitor-definition-controller';

const revision = 'a'.repeat(64);
const newerRevision = 'b'.repeat(64);
const item = { app: 'mysql', label: 'MySQL', origin: 'override' as const, editable: true, deletable: true, revision };
const detail = { schemaVersion: 1 as const, ...item, definition: 'app: mysql' };
const route: { navigate: NavigateFunction | null; search: string } = {
  navigate: null,
  search: ''
};

describe('useMonitorDefinitionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.navigate = null;
    route.search = '';
    auth.roles = ['ADMIN'];
    api.catalog.mockResolvedValue({ schemaVersion: 1, items: [item] });
    api.detail.mockResolvedValue(detail);
    api.validate.mockResolvedValue({ schemaVersion: 1, valid: true, app: 'mysql', origin: 'override' });
    api.create.mockResolvedValue(detail);
    api.update.mockResolvedValue({ ...detail, revision: newerRevision });
    api.remove.mockResolvedValue({ schemaVersion: 1, app: 'mysql', disposition: 'builtin_restored' });
  });

  it('loads, searches, views, and cancels without writes', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.setSearch('missing'));
    expect(result.current.items).toEqual([]);
    await act(() => result.current.actions.openView('mysql'));
    expect(result.current.workspace).toMatchObject({ kind: 'view', detail });
    act(() => result.current.actions.closeWorkspace());
    expect(result.current.workspace).toBeNull();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });

  it.each(['view', 'edit'] as const)('keeps a failed %s read as a retryable read error', async mode => {
    api.detail.mockRejectedValue(new MonitorDefinitionRequestError('unavailable'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    await act(() =>
      mode === 'view' ? result.current.actions.openView('mysql') : result.current.actions.openEdit('mysql')
    );

    expect(result.current.workspace).toEqual({
      kind: 'error',
      mode,
      app: 'mysql',
      failure: 'unavailable'
    });
    expect(result.current.workspace).not.toMatchObject({ kind: 'edit', draft: { mode: 'create' } });
  });

  it('validates and saves exact create and update drafts', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openCreate());
    act(() => result.current.actions.setDefinition('app: custom'));
    await act(() => result.current.actions.validate());
    expect(api.validate).toHaveBeenCalledWith({ operation: 'create', expectedApp: null, definition: 'app: custom' });
    await act(() => result.current.actions.save());
    expect(api.create).toHaveBeenCalledWith('app: custom', 'en-US', expect.any(AbortSignal));

    await act(() => result.current.actions.openEdit('mysql'));
    act(() => result.current.actions.setDefinition('app: mysql\nname: changed'));
    await act(() => result.current.actions.save());
    expect(api.update).toHaveBeenCalledWith(
      'mysql',
      'app: mysql\nname: changed',
      revision,
      'en-US',
      expect.any(AbortSignal)
    );
  });

  it('reports required YAML locally and sends no validate or save request for a blank create draft', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openCreate());

    await act(() => result.current.actions.validate());
    expect(result.current.workspace).toMatchObject({ kind: 'edit', failure: 'definition-required', pending: null });
    expect(api.validate).not.toHaveBeenCalled();

    act(() => result.current.actions.setDefinition(' \n\t '));
    await act(() => result.current.actions.save());
    expect(result.current.workspace).toMatchObject({ kind: 'edit', failure: 'definition-required', pending: null });
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('admits only one editor command in the same render and cannot close it while pending', async () => {
    let finishValidation:
      ((value: { schemaVersion: 1; valid: true; app: string; origin: 'custom' }) => void) | undefined;
    api.validate.mockImplementation(
      () =>
        new Promise(resolve => {
          finishValidation = resolve;
        })
    );
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openCreate());
    act(() => result.current.actions.setDefinition('app: custom'));

    let first!: Promise<void>;
    act(() => {
      first = result.current.actions.validate();
      void result.current.actions.validate();
      result.current.actions.closeWorkspace();
    });

    expect(api.validate).toHaveBeenCalledTimes(1);
    expect(result.current.workspace).toMatchObject({ kind: 'edit', pending: 'validate' });
    finishValidation?.({ schemaVersion: 1, valid: true, app: 'custom', origin: 'custom' });
    await act(() => first);
    expect(result.current.workspace).toMatchObject({ kind: 'edit', pending: null });
  });

  it('keeps a conflicting draft until explicit authoritative refresh', async () => {
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('revision-conflict'));
    api.detail.mockResolvedValueOnce(detail).mockResolvedValueOnce({
      ...detail,
      definition: 'app: mysql\nname: server',
      revision: newerRevision
    });
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(() => result.current.actions.openEdit('mysql'));
    act(() => result.current.actions.setDefinition('app: mysql\nname: local'));
    await act(() => result.current.actions.save());
    expect(result.current.workspace).toMatchObject({ kind: 'edit', failure: 'revision-conflict' });

    await act(() => result.current.actions.refreshAuthoritativeDraft());
    expect(result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { definition: 'app: mysql\nname: server', revision: newerRevision },
      failure: null
    });
  });

  it('reconciles the catalog after an uncertain update while preserving the draft for review', async () => {
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(() => result.current.actions.openEdit('mysql'));
    act(() => result.current.actions.setDefinition('app: mysql\nname: uncertain'));

    await act(() => result.current.actions.save());

    expect(result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { definition: 'app: mysql\nname: uncertain', revision },
      failure: 'state-uncertain'
    });
    await waitFor(() => expect(api.catalog).toHaveBeenCalledTimes(2));
  });

  it('reconciles the catalog after an uncertain delete while preserving its confirmation evidence', async () => {
    api.remove.mockRejectedValueOnce(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.requestDelete(item));

    await act(() => result.current.actions.confirmDelete());

    expect(result.current.deleteFailure).toBe('state-uncertain');
    expect(result.current.deleteTarget).toEqual(item);
    await waitFor(() => expect(api.catalog).toHaveBeenCalledTimes(2));
  });

  it.each([
    ['create', 'uncertain', 2],
    ['create', 'rejected', 1],
    ['update', 'uncertain', 2],
    ['update', 'rejected', 1],
    ['delete', 'uncertain', 2],
    ['delete', 'rejected', 1]
  ] as const)(
    'uses one catalog proof after a %s write is %s and never replays the mutation',
    async (operation, outcome, catalogCalls) => {
      const writeError = new MonitorDefinitionRequestError('unavailable', outcome);
      const provedItem = { ...item, label: 'Authoritative MySQL' };
      prepareCatalogProof(outcome, provedItem);
      rejectMonitorDefinitionWrite(operation, writeError);
      const client = testClient();
      const publish = vi.spyOn(client, 'setQueryData');
      const view = renderController(client);
      await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));

      await exerciseRejectedWrite(view, operation, outcome);

      await waitFor(() => expect(api.catalog).toHaveBeenCalledTimes(catalogCalls));
      if (outcome === 'uncertain') {
        expect(publish).toHaveBeenCalled();
        await waitFor(() => expect(view.result.current.items).toEqual([provedItem]));
        await exerciseRetainedRecovery(view, operation);
        expect(api.catalog).toHaveBeenCalledTimes(3);
      }
      expectMonitorDefinitionWriteOnce(operation);
      expect(view.result.current.notice).toBeNull();
    }
  );

  it.each(['save', 'delete'] as const)(
    'preserves the original %s failure when its authoritative catalog proof fails',
    async operation => {
      api.catalog
        .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
        .mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable'));
      if (operation === 'save') {
        api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable', 'uncertain'));
      } else {
        api.remove.mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable', 'uncertain'));
      }
      const view = renderController();
      await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));

      if (operation === 'save') {
        await act(() => view.result.current.actions.openEdit('mysql'));
        act(() => view.result.current.actions.setDefinition('app: mysql\nname: local'));
        await act(() => view.result.current.actions.save());
        expect(view.result.current.workspace).toMatchObject({
          kind: 'edit',
          draft: { definition: 'app: mysql\nname: local', revision },
          failure: 'unavailable'
        });
        expect(api.update).toHaveBeenCalledOnce();
      } else {
        act(() => view.result.current.actions.requestDelete(item));
        await act(() => view.result.current.actions.confirmDelete());
        expect(view.result.current.deleteTarget).toEqual(item);
        expect(view.result.current.deleteFailure).toBe('unavailable');
        expect(api.remove).toHaveBeenCalledOnce();
      }
      expect(api.catalog).toHaveBeenCalledTimes(2);
      expect(view.result.current.notice).toBeNull();
    }
  );

  it('does not let an older catalog refresh overwrite post-failure proof evidence', async () => {
    const staleRefresh = deferred<{ schemaVersion: 1; items: [typeof item] }>();
    const provedItem = { ...item, label: 'Post-failure proof' };
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockReturnValueOnce(staleRefresh.promise)
      .mockResolvedValueOnce({ schemaVersion: 1, items: [provedItem] });
    api.create.mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable', 'uncertain'));
    const client = testClient();
    const view = renderController(client);
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));

    act(() => view.result.current.actions.refresh());
    await waitFor(() => expect(api.catalog).toHaveBeenCalledTimes(2));
    act(() => view.result.current.actions.openCreate());
    act(() => view.result.current.actions.setDefinition('app: custom'));
    await act(() => view.result.current.actions.save());
    await waitFor(() => expect(view.result.current.items).toEqual([provedItem]));

    staleRefresh.resolve({ schemaVersion: 1, items: [item] });
    await act(async () => staleRefresh.promise);
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(view.result.current.items).toEqual([provedItem]);
    expect(api.create).toHaveBeenCalledOnce();
    expect(api.catalog).toHaveBeenCalledTimes(3);
  });

  it.each(['save', 'delete'] as const)(
    'retires an in-flight %s catalog proof on ADMIN loss without late cache or UI publication',
    async operation => {
      const proof = deferred<{ schemaVersion: 1; items: [typeof item] }>();
      api.catalog.mockResolvedValueOnce({ schemaVersion: 1, items: [item] }).mockReturnValueOnce(proof.promise);
      if (operation === 'save') {
        api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable', 'uncertain'));
      } else {
        api.remove.mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable', 'uncertain'));
      }
      const client = testClient();
      const publish = vi.spyOn(client, 'setQueryData');
      const view = renderController(client);
      await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
      publish.mockClear();
      let command!: Promise<void>;
      if (operation === 'save') {
        await act(() => view.result.current.actions.openEdit('mysql'));
        act(() => view.result.current.actions.setDefinition('app: mysql\nname: local'));
        act(() => {
          command = view.result.current.actions.save();
        });
      } else {
        act(() => view.result.current.actions.requestDelete(item));
        act(() => {
          command = view.result.current.actions.confirmDelete();
        });
      }
      await waitFor(() => expect(api.catalog).toHaveBeenCalledTimes(2));
      const proofSignal = api.catalog.mock.calls[1]?.[1];

      auth.roles = ['USER'];
      view.rerender();
      await waitFor(() =>
        operation === 'save'
          ? expect(view.result.current.workspace).toEqual({ kind: 'view', detail })
          : expect(view.result.current.deleteTarget).toBeNull()
      );
      expect(proofSignal).toBeInstanceOf(AbortSignal);
      expect(proofSignal?.aborted).toBe(true);

      proof.resolve({ schemaVersion: 1, items: [{ ...item, label: 'Late proof' }] });
      await act(async () => command);
      expect(publish).not.toHaveBeenCalled();
      expect(view.result.current.workspace).toEqual(operation === 'save' ? { kind: 'view', detail } : null);
      expect(view.result.current.deleteFailure).toBeNull();
      expect(view.result.current.notice).toBeNull();
      expect(operation === 'save' ? api.update : api.remove).toHaveBeenCalledOnce();
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'retires an in-flight save on ADMIN loss and ignores its late %s',
    async completion => {
      const write = deferred<typeof detail>();
      const client = testClient();
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      api.create.mockReturnValue(write.promise);
      const view = renderController(client);
      await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
      invalidate.mockClear();
      act(() => view.result.current.actions.openCreate());
      act(() => view.result.current.actions.setDefinition('app: custom'));
      let save!: Promise<void>;
      act(() => {
        save = view.result.current.actions.save();
      });
      await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
      const signal = api.create.mock.calls[0]?.[2];

      auth.roles = ['USER'];
      view.rerender();
      await waitFor(() => expect(view.result.current.workspace).toBeNull());
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal?.aborted).toBe(true);

      if (completion === 'resolve') write.resolve(detail);
      else write.reject(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
      await act(async () => save);

      expect(view.result.current.workspace).toBeNull();
      expect(invalidate).not.toHaveBeenCalled();
      expect(api.catalog).toHaveBeenCalledOnce();
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'retires an in-flight delete on ADMIN loss and ignores its late %s',
    async completion => {
      const removal = deferred<{ schemaVersion: 1; app: string; disposition: 'builtin_restored' }>();
      const client = testClient();
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      api.remove.mockReturnValue(removal.promise);
      const view = renderController(client);
      await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
      invalidate.mockClear();
      act(() => view.result.current.actions.requestDelete(item));
      let deletion!: Promise<void>;
      act(() => {
        deletion = view.result.current.actions.confirmDelete();
      });
      await waitFor(() => expect(api.remove).toHaveBeenCalledOnce());
      const signal = api.remove.mock.calls[0]?.[2];

      auth.roles = ['USER'];
      view.rerender();
      await waitFor(() => expect(view.result.current.deletePending).toBe(false));
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal?.aborted).toBe(true);
      expect(view.result.current.deleteTarget).toBeNull();

      if (completion === 'resolve') {
        removal.resolve({ schemaVersion: 1, app: 'mysql', disposition: 'builtin_restored' });
      } else {
        removal.reject(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
      }
      await act(async () => deletion);

      expect(view.result.current.deleteTarget).toBeNull();
      expect(view.result.current.deleteFailure).toBeNull();
      expect(view.result.current.notice).toBeNull();
      expect(invalidate).not.toHaveBeenCalled();
      expect(api.catalog).toHaveBeenCalledOnce();
    }
  );

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
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
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
    'opens an initial app deep link as view without waiting for catalog for %s',
    async role => {
      auth.roles = [role];
      api.catalog.mockReturnValue(new Promise(() => {}));
      const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql', true);

      await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));

      expect(api.detail).toHaveBeenCalledTimes(1);
      expect(route.search).toBe('?scope=all&app=mysql');
    }
  );

  it.each(['not-found', 'app-invalid'] as const)('keeps a legal app and retryable %s route error', async failure => {
    api.detail.mockRejectedValueOnce(new MonitorDefinitionRequestError(failure)).mockResolvedValueOnce(detail);
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');

    await waitFor(() =>
      expect(view.result.current.workspace).toEqual({ kind: 'error', mode: 'view', app: 'mysql', failure })
    );

    expect(route.search).toBe('?scope=all&app=mysql');
    expect(api.detail).toHaveBeenCalledOnce();
    await act(() => view.result.current.actions.retryWorkspace());
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
    expect(route.search).toBe('?scope=all&app=mysql');
  });

  it('retires an old detail when browser navigation changes app and closes on app removal', async () => {
    const mysql = deferred<typeof detail>();
    const jvmDetail = { ...detail, app: 'jvm', label: 'JVM' };
    let mysqlCalls = 0;
    api.detail.mockImplementation((app: string) => {
      if (app === 'mysql' && mysqlCalls++ === 0) return mysql.promise;
      return Promise.resolve(app === 'jvm' ? jvmDetail : detail);
    });
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'loading', mode: 'view', app: 'mysql' }));

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?scope=all&app=jvm');
    });
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail: jvmDetail }));
    mysql.resolve(detail);
    await act(async () => mysql.promise);
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail: jvmDetail });

    act(() => {
      void observedNavigate()(-1);
    });
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    act(() => {
      void observedNavigate()(1);
    });
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail: jvmDetail }));

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?scope=all');
    });
    await waitFor(() => expect(view.result.current.workspace).toBeNull());
    expect(route.search).toBe('?scope=all');
    expect(api.detail).toHaveBeenCalledTimes(4);
  });

  it('syncs explicit view and edit identity to the URL while keeping mode interaction-owned', async () => {
    const view = renderControllerAt('/settings/monitor-definitions?scope=all');
    await act(() => view.result.current.actions.openView('mysql'));
    await waitFor(() => expect(route.search).toBe('?scope=all&app=mysql'));
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });

    await act(() => view.result.current.actions.openEdit('mysql'));
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', draft: { expectedApp: 'mysql' } });
    expect(route.search).toBe('?scope=all&app=mysql');

    act(() => view.result.current.actions.closeWorkspace());
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(view.result.current.workspace).toBeNull();
  });

  it('defers a changed route until an exclusive editor command settles', async () => {
    const validation = deferred<{ schemaVersion: 1; valid: true; app: string; origin: 'override' }>();
    const jvmDetail = { ...detail, app: 'jvm', label: 'JVM' };
    api.validate.mockReturnValueOnce(validation.promise);
    api.detail.mockImplementation((app: string) => Promise.resolve(app === 'jvm' ? jvmDetail : detail));
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: local'));
    let command!: Promise<void>;
    act(() => {
      command = view.result.current.actions.validate();
    });
    await waitFor(() => expect(api.validate).toHaveBeenCalledOnce());

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?app=jvm');
    });
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', pending: 'validate' });
    expect(api.detail).toHaveBeenCalledTimes(2);
    validation.resolve({ schemaVersion: 1, valid: true, app: 'mysql', origin: 'override' });
    await act(async () => command);

    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail: jvmDetail }));
    expect(api.detail).toHaveBeenCalledTimes(3);
  });

  it('holds an uncertain write recovery across route changes until explicit close', async () => {
    const jvmDetail = { ...detail, app: 'jvm', label: 'JVM' };
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
    api.detail.mockImplementation((app: string) => Promise.resolve(app === 'jvm' ? jvmDetail : detail));
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: uncertain'));
    await act(() => view.result.current.actions.save());
    await waitFor(() =>
      expect(view.result.current.workspace).toMatchObject({ kind: 'edit', writeRecovery: 'uncertain' })
    );

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?app=jvm');
    });
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { expectedApp: 'mysql' },
      writeRecovery: 'uncertain'
    });
    expect(api.detail).toHaveBeenCalledTimes(2);

    act(() => view.result.current.actions.closeWorkspace());
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail: jvmDetail }));
    expect(route.search).toBe('?app=jvm');
  });

  it('does not change route identity when an explicit open is rejected by a pending command', async () => {
    const write = deferred<typeof detail>();
    const createdDetail = { ...detail, app: 'custom', label: 'Custom', definition: 'app: custom' };
    api.create.mockReturnValueOnce(write.promise);
    const view = renderControllerAt('/settings/monitor-definitions?scope=all');
    act(() => view.result.current.actions.openCreate());
    act(() => view.result.current.actions.setDefinition('app: custom'));
    let saving!: Promise<void>;
    act(() => {
      saving = view.result.current.actions.save();
    });
    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());

    await act(() => view.result.current.actions.openView('mysql'));
    expect(route.search).toBe('?scope=all');
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', pending: 'save' });
    expect(api.detail).not.toHaveBeenCalled();

    write.resolve(createdDetail);
    await act(async () => saving);
    expect(route.search).toBe('?scope=all');
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail: createdDetail });
  });

  it('does not replace uncertain write evidence through an explicit open action', async () => {
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: uncertain'));
    await act(() => view.result.current.actions.save());
    await waitFor(() =>
      expect(view.result.current.workspace).toMatchObject({ kind: 'edit', writeRecovery: 'uncertain' })
    );
    const detailCalls = api.detail.mock.calls.length;

    await act(() => view.result.current.actions.openView('jvm'));

    expect(route.search).toBe('?app=mysql');
    expect(api.detail).toHaveBeenCalledTimes(detailCalls);
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { expectedApp: 'mysql' },
      writeRecovery: 'uncertain'
    });
  });

  it('keeps a reader deep link when a forbidden create action is rejected', async () => {
    auth.roles = ['USER'];
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));

    act(() => view.result.current.actions.openCreate());

    expect(route.search).toBe('?scope=all&app=mysql');
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
  });

  it('replaces the current history entry when an explicit close removes app identity', async () => {
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));

    act(() => view.result.current.actions.closeWorkspace());
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    act(() => {
      void observedNavigate()(-1);
    });

    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(view.result.current.workspace).toBeNull();
  });

  it('canonicalizes blank and unsafe app values without requesting detail', async () => {
    const unsafe = encodeURIComponent(`mysql${String.fromCharCode(0)}`);
    const blank = renderControllerAt('/settings/monitor-definitions?scope=all&app=%20%20');
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(api.detail).not.toHaveBeenCalled();
    blank.unmount();

    const invalid = renderControllerAt(`/settings/monitor-definitions?scope=all&app=${unsafe}`);
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(api.detail).not.toHaveBeenCalled();
    invalid.unmount();
  });

  it('restores only a view after ADMIN loss and never upgrades a USER view after ADMIN gain', async () => {
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    await act(() => view.result.current.actions.openEdit('mysql'));
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit' });

    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    auth.roles = ['ADMIN'];
    view.rerender();
    await waitFor(() => expect(view.result.current.canWrite).toBe(true));
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
  });
});

type WriteOperation = 'create' | 'update' | 'delete';
type WriteOutcome = 'uncertain' | 'rejected';
type ControllerView = ReturnType<typeof renderController>;

function prepareCatalogProof(outcome: WriteOutcome, provedItem: typeof item) {
  api.catalog.mockResolvedValue({ schemaVersion: 1, items: [item] });
  if (outcome !== 'uncertain') return;
  api.catalog
    .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
    .mockResolvedValueOnce({ schemaVersion: 1, items: [provedItem] })
    .mockResolvedValueOnce({ schemaVersion: 1, items: [provedItem] });
}

function rejectMonitorDefinitionWrite(operation: WriteOperation, error: MonitorDefinitionRequestError) {
  if (operation === 'create') api.create.mockRejectedValueOnce(error);
  else if (operation === 'update') api.update.mockRejectedValueOnce(error);
  else api.remove.mockRejectedValueOnce(error);
}

async function exerciseRejectedWrite(view: ControllerView, operation: WriteOperation, outcome: WriteOutcome) {
  const writeRecovery = outcome === 'uncertain' ? 'uncertain' : null;
  if (operation === 'create') {
    act(() => view.result.current.actions.openCreate());
    act(() => view.result.current.actions.setDefinition('app: custom'));
    await act(() => view.result.current.actions.save());
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { mode: 'create', definition: 'app: custom' },
      failure: 'unavailable',
      writeRecovery
    });
    return;
  }
  if (operation === 'update') {
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: local'));
    await act(() => view.result.current.actions.save());
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { mode: 'update', definition: 'app: mysql\nname: local', revision },
      failure: 'unavailable',
      writeRecovery
    });
    return;
  }
  act(() => view.result.current.actions.requestDelete(item));
  await act(() => view.result.current.actions.confirmDelete());
  expect(view.result.current.deleteTarget).toEqual(item);
  expect(view.result.current.deleteFailure).toBe('unavailable');
  expect(view.result.current.deleteWriteRecovery).toBe(writeRecovery);
}

async function exerciseRetainedRecovery(view: ControllerView, operation: WriteOperation) {
  if (operation === 'delete') {
    await act(() => view.result.current.actions.confirmDelete());
    await act(() => view.result.current.actions.retryDeleteProof());
    return;
  }
  await act(() => view.result.current.actions.save());
  await act(() => view.result.current.actions.validate());
  act(() => view.result.current.actions.setDefinition('replaced'));
  await act(() => view.result.current.actions.retryWorkspaceProof());
}

function expectMonitorDefinitionWriteOnce(operation: WriteOperation) {
  if (operation === 'create') expect(api.create).toHaveBeenCalledOnce();
  else if (operation === 'update') expect(api.update).toHaveBeenCalledOnce();
  else expect(api.remove).toHaveBeenCalledOnce();
}

function testClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderController(client = testClient()) {
  return renderControllerWithOptions(client, '/settings/monitor-definitions', false);
}

function renderControllerAt(initialEntry: string, strict = false) {
  return renderControllerWithOptions(testClient(), initialEntry, strict);
}

function renderControllerWithOptions(client: QueryClient, initialEntry: string, strict: boolean) {
  const wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <RouterObserver />
      <QueryClientProvider client={client}>
        {strict ? <StrictMode>{children}</StrictMode> : children}
      </QueryClientProvider>
    </MemoryRouter>
  );
  return renderHook(() => useMonitorDefinitionController(), { wrapper });
}

function RouterObserver() {
  const navigate = useNavigate();
  const location = useLocation();
  useLayoutEffect(() => {
    route.navigate = navigate;
    route.search = location.search;
  }, [location.search, navigate]);
  return null;
}

function observedNavigate() {
  const navigate = route.navigate;
  if (navigate === null) throw new Error('Router observer is not ready');
  return navigate;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}
