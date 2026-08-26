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
  renderControllerAt,
  resetMonitorDefinitionControllerFixture,
  revision,
  route,
  testClient,
  updateWorkspace
} from './use-monitor-definition-controller-test-support';

describe('useMonitorDefinitionController read and write', () => {
  beforeEach(resetMonitorDefinitionControllerFixture);

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

  it('retains authoritative YAML, blocks dirty app switching, and cancels back to the authoritative draft', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    await act(() => view.result.current.actions.openEdit('mysql'));
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', authority: detail });

    act(() => view.result.current.actions.setDefinition('app: mysql\nname: local'));
    await act(() => view.result.current.actions.openView('jvm'));
    expect(api.detail).toHaveBeenCalledTimes(1);
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      authority: detail,
      draft: { definition: 'app: mysql\nname: local' },
      failure: 'unsaved-changes'
    });
    expect(route.search).toBe('?app=mysql');

    act(() => view.result.current.actions.cancelEdit());
    expect(view.result.current.workspace).toEqual(updateWorkspace(detail));
    expect(route.search).toBe('?app=mysql');
  });

  it('does not save an unchanged update draft', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    await act(() => view.result.current.actions.openEdit('mysql'));

    await act(() => view.result.current.actions.save());

    expect(api.update).not.toHaveBeenCalled();
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', authority: detail });
  });

  it('rereads the canonical detail and catalog after a successful create', async () => {
    const mutationDetail = {
      ...detail,
      app: 'custom',
      label: 'Mutation Custom',
      definition: 'app: custom',
      origin: 'custom' as const,
      revision: newerRevision
    };
    const canonicalDetail = { ...mutationDetail, label: 'Canonical Custom', revision: 'c'.repeat(64) };
    const canonicalItem = {
      app: canonicalDetail.app,
      label: canonicalDetail.label,
      origin: canonicalDetail.origin,
      editable: canonicalDetail.editable,
      deletable: canonicalDetail.deletable,
      revision: canonicalDetail.revision
    };
    api.create.mockResolvedValueOnce(mutationDetail);
    api.detail.mockImplementation((app: string) => Promise.resolve(app === 'custom' ? canonicalDetail : detail));
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item, canonicalItem] });
    const { result } = renderControllerAt('/settings/monitor-definitions?scope=all');
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openCreate());
    act(() => result.current.actions.setDefinition('app: custom'));

    await act(() => result.current.actions.save());

    expect(api.detail).toHaveBeenCalledWith('custom', 'en-US', expect.any(AbortSignal));
    expect(api.catalog).toHaveBeenCalledTimes(2);
    expect(result.current.workspace).toEqual(updateWorkspace(canonicalDetail));
    expect(result.current.items).toEqual([item, canonicalItem]);
    await waitFor(() => expect(route.search).toBe('?scope=all&app=custom'));
  });

  it('rereads the canonical detail and catalog after a successful revisioned update', async () => {
    const mutationDetail = { ...detail, definition: 'app: mysql\nname: mutation', revision: newerRevision };
    const canonicalDetail = { ...mutationDetail, definition: 'app: mysql\nname: canonical', revision: 'c'.repeat(64) };
    const canonicalItem = {
      app: canonicalDetail.app,
      label: canonicalDetail.label,
      origin: canonicalDetail.origin,
      editable: canonicalDetail.editable,
      deletable: canonicalDetail.deletable,
      revision: canonicalDetail.revision
    };
    api.update.mockResolvedValueOnce(mutationDetail);
    api.detail.mockResolvedValueOnce(detail).mockResolvedValueOnce(canonicalDetail);
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockResolvedValueOnce({ schemaVersion: 1, items: [canonicalItem] });
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(() => result.current.actions.openEdit('mysql'));
    act(() => result.current.actions.setDefinition('app: mysql\nname: local'));

    await act(() => result.current.actions.save());

    expect(api.update).toHaveBeenCalledWith(
      'mysql',
      'app: mysql\nname: local',
      revision,
      'en-US',
      expect.any(AbortSignal)
    );
    expect(api.detail).toHaveBeenLastCalledWith('mysql', 'en-US', expect.any(AbortSignal));
    expect(api.catalog).toHaveBeenCalledTimes(2);
    expect(result.current.workspace).toEqual(updateWorkspace(canonicalDetail));
    expect(result.current.items).toEqual([canonicalItem]);
  });

  it('keeps delete confirmation pending until the canonical catalog reread completes', async () => {
    const canonicalCatalog = deferred<{ schemaVersion: 1; items: [] }>();
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockReturnValueOnce(canonicalCatalog.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.requestDelete(item));
    let deletion!: Promise<void>;
    act(() => {
      deletion = result.current.actions.confirmDelete();
    });
    await waitFor(() => expect(api.remove).toHaveBeenCalledOnce());

    expect(result.current.deletePending).toBe(true);
    expect(result.current.deleteTarget).toEqual(item);
    canonicalCatalog.resolve({ schemaVersion: 1, items: [] });
    await act(async () => deletion);

    expect(api.catalog).toHaveBeenCalledTimes(2);
    expect(result.current.items).toEqual([]);
    expect(result.current.deleteTarget).toBeNull();
    expect(result.current.notice).toBe('builtin_restored');
  });

  it('closes a removed selected custom definition and clears only its app query', async () => {
    api.remove.mockResolvedValueOnce({ schemaVersion: 1, app: 'mysql', disposition: 'removed' });
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockResolvedValueOnce({ schemaVersion: 1, items: [] });
    const { result } = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');
    await waitFor(() => expect(result.current.workspace).toEqual(updateWorkspace(detail)));
    act(() => result.current.actions.requestDelete(item));

    await act(() => result.current.actions.confirmDelete());

    expect(result.current.workspace).toBeNull();
    await waitFor(() => expect(route.search).toBe('?scope=all'));
  });

  it('reloads canonical built-in YAML after deleting a selected override', async () => {
    const restored = {
      ...detail,
      origin: 'builtin' as const,
      editable: false,
      deletable: false,
      definition: 'app: mysql\nname: builtin',
      revision: newerRevision
    };
    api.detail.mockResolvedValueOnce(detail).mockResolvedValueOnce(restored);
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockResolvedValueOnce({ schemaVersion: 1, items: [{ ...restored }] });
    const { result } = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(result.current.workspace).toEqual(updateWorkspace(detail)));
    act(() => result.current.actions.requestDelete(item));

    await act(() => result.current.actions.confirmDelete());

    expect(api.detail).toHaveBeenCalledTimes(2);
    expect(result.current.workspace).toEqual({ kind: 'view', detail: restored });
    expect(route.search).toBe('?app=mysql');
  });

  it('publishes canonical visibility and refreshes dynamic navigation only after a successful write', async () => {
    const hiddenItem = { ...item, hidden: true };
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [item] })
      .mockResolvedValueOnce({ schemaVersion: 1, items: [hiddenItem] });
    const client = testClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
    const { result } = renderController(client);
    await waitFor(() => expect(result.current.items).toEqual([item]));

    await act(() => result.current.actions.updateVisibility(item));

    expect(api.visibility).toHaveBeenCalledWith('mysql', true, expect.any(AbortSignal));
    expect(result.current.items).toEqual([hiddenItem]);
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['shell', 'monitor-navigation'], type: 'active' });
    expect(result.current.visibilityFailure).toBeNull();
  });

  it('preserves prior visibility and skips navigation refresh when the write fails', async () => {
    api.visibility.mockRejectedValueOnce(new MonitorDefinitionRequestError('unavailable', 'uncertain'));
    const client = testClient();
    const refetch = vi.spyOn(client, 'refetchQueries');
    const { result } = renderController(client);
    await waitFor(() => expect(result.current.items).toEqual([item]));

    await act(() => result.current.actions.updateVisibility(item));

    expect(result.current.items).toEqual([item]);
    expect(result.current.visibilityFailure).toBe('unavailable');
    expect(refetch).not.toHaveBeenCalled();
    expect(api.catalog).toHaveBeenCalledOnce();
  });

  it('retires an in-flight visibility write when ADMIN authority is lost', async () => {
    const write = deferred<void>();
    api.visibility.mockReturnValueOnce(write.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.items).toEqual([item]));
    let completion!: Promise<void>;
    act(() => {
      completion = view.result.current.actions.updateVisibility(item);
    });
    await waitFor(() => expect(api.visibility).toHaveBeenCalledOnce());
    const signal = api.visibility.mock.calls[0]?.[2];

    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.visibilityPendingApp).toBeNull());
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(true);
    write.resolve();
    await act(async () => completion);

    expect(api.catalog).toHaveBeenCalledOnce();
    expect(view.result.current.visibilityFailure).toBeNull();
  });

  it('opens a real builtin deep link for editing and saves it as an active override', async () => {
    const builtin = { ...detail, origin: 'builtin' as const, deletable: false };
    const override = {
      ...detail,
      origin: 'override' as const,
      editable: true,
      deletable: true,
      definition: 'app: mysql\nname: override',
      revision: newerRevision
    };
    api.catalog
      .mockResolvedValueOnce({ schemaVersion: 1, items: [{ ...builtin }] })
      .mockResolvedValueOnce({ schemaVersion: 1, items: [{ ...override }] });
    api.detail.mockResolvedValueOnce(builtin).mockResolvedValueOnce(override);
    api.update.mockResolvedValueOnce(override);
    const { result } = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(result.current.workspace).toEqual(updateWorkspace(builtin)));
    act(() => result.current.actions.setDefinition('app: mysql\nname: override'));

    await act(() => result.current.actions.save());

    expect(api.update).toHaveBeenCalledWith(
      'mysql',
      'app: mysql\nname: override',
      revision,
      'en-US',
      expect.any(AbortSignal)
    );
    expect(result.current.workspace).toEqual(updateWorkspace(override));
    expect(result.current.items).toEqual([{ ...override }]);
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
});
