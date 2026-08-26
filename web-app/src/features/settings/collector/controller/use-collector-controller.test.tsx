/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  access,
  clearCollectorControllerFixture,
  clearIntake,
  useCollectorControllerTestHook,
  collector,
  deferred,
  intakeRequest,
  load,
  loadProof,
  loadRuntime,
  mutate,
  page,
  resetCollectorControllerFixture,
  runtimeConfig,
  runtimeDraft,
  saveIntake,
  saveRuntime,
  wrapper
} from './use-collector-controller-test-support';

describe('useCollectorController admission and command ownership', () => {
  beforeEach(resetCollectorControllerFixture);
  afterEach(clearCollectorControllerFixture);

  it('keeps GUEST reads active while rejecting every Collector write-flow admission', async () => {
    access.roles = ['GUEST'];
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => {
      result.current.actions.requestAction('offline', ['edge']);
      result.current.actions.requestAction('delete', ['edge']);
      result.current.actions.openIntake('edge');
      void result.current.actions.openRuntimeConfig('edge');
      void result.current.actions.saveIntake(intakeRequest());
      void result.current.actions.clearIntake();
      void result.current.actions.saveRuntimeConfig(runtimeDraft());
    });

    expect(result.current.capabilities).toEqual({ canRead: true, canWrite: false, canDelete: false });
    expect(result.current.pendingAction).toBeNull();
    expect(result.current.intakeEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
    expect(saveIntake).not.toHaveBeenCalled();
    expect(clearIntake).not.toHaveBeenCalled();
    expect(loadRuntime).not.toHaveBeenCalled();
    expect(saveRuntime).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
  });

  it('admits USER PUT workflows but rejects every DELETE before transport', async () => {
    access.roles = ['USER'];
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.requestAction('offline', ['edge']));
    expect(result.current.pendingAction?.action).toBe('offline');
    act(() => result.current.actions.cancelAction());
    act(() => result.current.actions.requestAction('delete', ['edge']));
    expect(result.current.pendingAction).toBeNull();

    act(() => result.current.actions.openIntake('edge'));
    await act(async () => result.current.actions.clearIntake());
    expect(clearIntake).not.toHaveBeenCalled();
    await act(async () => result.current.actions.saveIntake(intakeRequest()));
    expect(saveIntake).toHaveBeenCalledOnce();
  });

  it('retires write editors and pending commands on role loss without repeating an in-flight runtime PUT', async () => {
    access.roles = ['USER'];
    const write = deferred<ReturnType<typeof runtimeConfig>>();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    saveRuntime.mockReturnValue(write.promise);
    const view = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    await act(async () => view.result.current.actions.openRuntimeConfig('edge'));
    act(() => view.result.current.actions.requestAction('offline', ['edge']));
    act(() => {
      void view.result.current.actions.saveRuntimeConfig(runtimeDraft());
    });
    await waitFor(() => expect(saveRuntime).toHaveBeenCalledOnce());

    access.roles = ['GUEST'];
    view.rerender();
    await waitFor(() => expect(view.result.current.runtimeEditor).toBeNull());
    expect(view.result.current.pendingAction).toBeNull();
    write.resolve(runtimeConfig({ revision: 8 }));
    await act(async () => write.promise);

    expect(saveRuntime).toHaveBeenCalledOnce();
    act(() => {
      void view.result.current.actions.saveRuntimeConfig(runtimeDraft());
      void view.result.current.actions.confirmAction();
    });
    expect(saveRuntime).toHaveBeenCalledOnce();
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)(
    'retires an unauthorized pending write and ignores its late %s',
    async completion => {
      access.roles = ['USER'];
      const write = deferred<unknown>();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const setQueryData = vi.spyOn(queryClient, 'setQueryData');
      load.mockResolvedValue(page(0, [collector('edge')], 1));
      mutate.mockReturnValue(write.promise);
      const view = renderHook(useCollectorControllerTestHook, {
        wrapper: wrapper('/settings/collectors', queryClient)
      });
      await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
      setQueryData.mockClear();
      act(() => {
        view.result.current.actions.toggleSelection('edge', true);
        view.result.current.actions.requestAction('offline', ['edge']);
      });
      let confirmation!: Promise<void>;
      act(() => {
        confirmation = view.result.current.actions.confirmAction();
      });
      await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
      const signal = mutate.mock.calls[0]?.[2];

      access.roles = ['GUEST'];
      view.rerender();
      await waitFor(() => expect(view.result.current.mutating).toBe(false));
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal?.aborted).toBe(true);
      expect(view.result.current.pendingAction).toBeNull();
      expect(view.result.current.selected).toEqual([]);
      const successBefore = document.body.textContent?.match(/collectors\.mutationSuccess/gu)?.length ?? 0;

      if (completion === 'resolve') write.resolve(undefined);
      else write.reject(new Error('late retired failure'));
      await act(async () => confirmation);

      expect(loadProof).not.toHaveBeenCalled();
      expect(setQueryData).not.toHaveBeenCalled();
      expect(view.result.current.mutationFailure).toBeNull();
      expect(view.result.current.listState.kind).toBe('ready');
      expect(document.body.textContent?.match(/collectors\.mutationSuccess/gu)?.length ?? 0).toBe(successBefore);
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'retires an unauthorized pending proof and ignores its late %s',
    async completion => {
      access.roles = ['USER'];
      const proof = deferred<ReturnType<typeof page>>();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const setQueryData = vi.spyOn(queryClient, 'setQueryData');
      load.mockResolvedValue(page(0, [collector('edge')], 1));
      mutate.mockResolvedValue(undefined);
      loadProof.mockReturnValue(proof.promise);
      const view = renderHook(useCollectorControllerTestHook, {
        wrapper: wrapper('/settings/collectors', queryClient)
      });
      await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
      setQueryData.mockClear();
      act(() => view.result.current.actions.requestAction('offline', ['edge']));
      let confirmation!: Promise<void>;
      act(() => {
        confirmation = view.result.current.actions.confirmAction();
      });
      await waitFor(() => expect(loadProof).toHaveBeenCalledOnce());
      const signal = loadProof.mock.calls[0]?.[1];

      access.roles = ['GUEST'];
      view.rerender();
      await waitFor(() => expect(view.result.current.mutating).toBe(false));
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal?.aborted).toBe(true);

      if (completion === 'resolve') proof.resolve(page(0, [{ ...collector('edge'), online: false }], 1));
      else proof.reject(new Error('late retired proof failure'));
      await act(async () => confirmation);

      expect(setQueryData).not.toHaveBeenCalled();
      expect(view.result.current.pendingAction).toBeNull();
      expect(view.result.current.mutationFailure).toBeNull();
      expect(view.result.current.listState.kind).toBe('ready');
    }
  );

  it('retires during deferred query-cancel preflight without starting mutation transport', async () => {
    access.roles = ['USER'];
    const preflight = deferred<void>();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const cancelQueries = vi.spyOn(queryClient, 'cancelQueries').mockReturnValue(preflight.promise);
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    const view = renderHook(useCollectorControllerTestHook, {
      wrapper: wrapper('/settings/collectors', queryClient)
    });
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    act(() => view.result.current.actions.requestAction('offline', ['edge']));
    let confirmation!: Promise<void>;
    act(() => {
      confirmation = view.result.current.actions.confirmAction();
    });
    await waitFor(() => expect(cancelQueries).toHaveBeenCalledOnce());

    access.roles = ['GUEST'];
    view.rerender();
    await waitFor(() => expect(view.result.current.mutating).toBe(false));
    preflight.resolve(undefined);
    await act(async () => confirmation);

    expect(mutate).not.toHaveBeenCalled();
    expect(loadProof).not.toHaveBeenCalled();
    expect(view.result.current.pendingAction).toBeNull();
    expect(view.result.current.mutating).toBe(false);
  });

  it('retires an in-flight delete after ADMIN downgrades to USER without clearing writable selection', async () => {
    const write = deferred<unknown>();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    mutate.mockReturnValue(write.promise);
    const view = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    act(() => {
      view.result.current.actions.toggleSelection('edge', true);
      view.result.current.actions.requestAction('delete', ['edge']);
    });
    let confirmation!: Promise<void>;
    act(() => {
      confirmation = view.result.current.actions.confirmAction();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    const signal = mutate.mock.calls[0]?.[2];

    access.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.mutating).toBe(false));

    expect(signal?.aborted).toBe(true);
    expect(view.result.current.pendingAction).toBeNull();
    expect(view.result.current.selected).toEqual(['edge']);
    const queryBeforeCompletion = view.result.current.query;
    const successBefore = document.body.textContent?.match(/collectors\.mutationSuccess/gu)?.length ?? 0;
    write.resolve(undefined);
    await act(async () => confirmation);

    expect(loadProof).not.toHaveBeenCalled();
    expect(view.result.current.selected).toEqual(['edge']);
    expect(view.result.current.query).toEqual(queryBeforeCompletion);
    expect(document.body.textContent?.match(/collectors\.mutationSuccess/gu)?.length ?? 0).toBe(successBefore);
  });

  it('keeps an authorized offline mutation owned after ADMIN downgrades to USER', async () => {
    const write = deferred<unknown>();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    mutate.mockReturnValue(write.promise);
    loadProof.mockResolvedValue(page(0, [{ ...collector('edge'), online: false }], 1));
    const view = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    act(() => view.result.current.actions.requestAction('offline', ['edge']));
    let confirmation!: Promise<void>;
    act(() => {
      confirmation = view.result.current.actions.confirmAction();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    const signal = mutate.mock.calls[0]?.[2];

    access.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.capabilities.canDelete).toBe(false));

    expect(view.result.current.mutating).toBe(true);
    expect(signal?.aborted).toBe(false);
    write.resolve(undefined);
    await act(async () => confirmation);
    expect(loadProof).toHaveBeenCalledOnce();
    expect(view.result.current.mutationFailure).toBeNull();
  });

  it('retires mutation ownership on unmount and starts no proof transport after a late write', async () => {
    const write = deferred<unknown>();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    mutate.mockReturnValue(write.promise);
    const view = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(view.result.current.listState.kind).toBe('ready'));
    act(() => view.result.current.actions.requestAction('offline', ['edge']));
    let confirmation!: Promise<void>;
    act(() => {
      confirmation = view.result.current.actions.confirmAction();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    const signal = mutate.mock.calls[0]?.[2];

    view.unmount();
    expect(signal?.aborted).toBe(true);
    write.resolve(undefined);
    await confirmation;

    expect(loadProof).not.toHaveBeenCalled();
  });
});
