/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MonitorDefinitionRequestError } from '../api/monitor-definition-api';

import {
  api,
  auth,
  deferred,
  detail,
  item,
  newerRevision,
  renderController,
  resetMonitorDefinitionControllerFixture,
  revision,
  testClient
} from './use-monitor-definition-controller-test-support';

describe('useMonitorDefinitionController write recovery', () => {
  beforeEach(resetMonitorDefinitionControllerFixture);

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

  it('never replays an accepted update when its canonical detail reread fails', async () => {
    api.detail.mockResolvedValueOnce(detail).mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(() => result.current.actions.openEdit('mysql'));
    act(() => result.current.actions.setDefinition('app: mysql\nname: accepted'));

    await act(() => result.current.actions.save());

    expect(api.update).toHaveBeenCalledOnce();
    expect(result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { definition: 'app: mysql\nname: accepted', revision },
      failure: 'unavailable',
      writeRecovery: 'uncertain'
    });
    await waitFor(() => expect(api.catalog).toHaveBeenCalledTimes(3));
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

  it('never replays an accepted delete when its canonical catalog reread fails', async () => {
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable'))
      .mockResolvedValueOnce({ schemaVersion: 1, items: [] });
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.requestDelete(item));

    await act(() => result.current.actions.confirmDelete());

    expect(api.remove).toHaveBeenCalledOnce();
    expect(result.current.deleteTarget).toEqual(item);
    expect(result.current.deleteFailure).toBe('unavailable');
    expect(result.current.deleteWriteRecovery).toBe('uncertain');
    expect(api.catalog).toHaveBeenCalledTimes(3);
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
