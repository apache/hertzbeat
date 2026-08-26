/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  clearCollectorControllerFixture,
  collector,
  useCollectorControllerTestHook,
  deferred,
  load,
  loadRuntime,
  navigateRoute,
  page,
  resetCollectorControllerFixture,
  runtimeConfig,
  runtimeDraft,
  saveRuntime,
  waitForRuntimeApplication,
  wrapper
} from './use-collector-controller-test-support';

describe('useCollectorController runtime configuration', () => {
  beforeEach(resetCollectorControllerFixture);
  afterEach(clearCollectorControllerFixture);

  it('upgrades a legacy runtime config and proves its preserved schema-3 update by authoritative GET', async () => {
    const legacy = runtimeConfig({ schemaVersion: 1, revision: 4, environment: '' });
    const update = runtimeConfig({ revision: 5, environment: 'staging', hostMetricsInterval: 'PT45S' });
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValueOnce(legacy).mockResolvedValueOnce(update);
    saveRuntime.mockResolvedValue(update);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    await waitFor(() =>
      expect(result.current.runtimeEditor?.config).toMatchObject({
        schemaVersion: 1,
        revision: 4,
        environment: '',
        prometheusTargetCount: 1,
        fileLogSourceCount: 1
      })
    );
    await act(async () =>
      result.current.actions.saveRuntimeConfig(runtimeDraft({ environment: 'staging', hostMetricsIntervalSeconds: 45 }))
    );

    expect(saveRuntime).toHaveBeenCalledWith('edge', update);
    await waitFor(() => expect(waitForRuntimeApplication).toHaveBeenCalledWith('edge', 5, expect.any(Object)));
    await waitFor(() =>
      expect(result.current.runtimeApplication).toMatchObject({
        kind: 'management-saved',
        collector: 'edge',
        revision: 5,
        application: { kind: 'applied', revision: 5 }
      })
    );
    expect(loadRuntime).toHaveBeenNthCalledWith(2, 'edge');
    expect(saveRuntime.mock.calls[0]?.[1]).toMatchObject({
      schemaVersion: 3,
      revision: 5,
      prometheusTargets: legacy.prometheusTargets,
      fileLogSources: legacy.fileLogSources
    });
    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.runtimeFailure).toBeNull();
  });

  it('retains the runtime editor and rejects success when PUT response and authoritative GET disagree', async () => {
    const current = runtimeConfig();
    const update = runtimeConfig({ revision: 8, environment: 'staging' });
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValueOnce(current).mockResolvedValueOnce(current);
    saveRuntime.mockResolvedValue(update);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    const successesBefore = document.body.textContent?.match(/collectors\.runtime\.success/gu)?.length ?? 0;

    await act(async () => result.current.actions.saveRuntimeConfig(runtimeDraft({ environment: 'staging' })));

    expect(result.current.runtimeEditor).not.toBeNull();
    expect(result.current.runtimeFailure).toBe('validation');
    expect(document.body.textContent?.match(/collectors\.runtime\.success/gu)?.length ?? 0).toBe(successesBefore);
  });

  it('rejects success when PUT response and reread both remain on the unchanged config', async () => {
    const current = runtimeConfig();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(current);
    saveRuntime.mockResolvedValue(current);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));

    await act(async () => result.current.actions.saveRuntimeConfig(runtimeDraft({ environment: 'staging' })));

    expect(result.current.runtimeEditor).not.toBeNull();
    expect(result.current.runtimeFailure).toBe('validation');
  });

  it('rejects an invalid runtime draft before PUT and clears owned failure on cancel', async () => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));

    await act(async () => result.current.actions.saveRuntimeConfig(runtimeDraft({ hostMetricsIntervalSeconds: 9 })));
    expect(saveRuntime).not.toHaveBeenCalled();
    expect(result.current.runtimeFailure).toBe('validation');

    act(() => result.current.actions.cancelRuntimeConfig());
    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.runtimeFailure).toBeNull();
  });

  it.each([
    [new ApiMessageError('raw forbidden detail', { status: 403 }), 'permission'],
    [new ApiMessageError('raw validation detail', { status: 422 }), 'validation'],
    [new ApiMessageError('raw unavailable detail', { status: 503 }), 'unavailable'],
    [new Error('raw generic detail'), 'error']
  ] as const)('classifies runtime PUT failure without proof or raw state %#', async (error, failure) => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    saveRuntime.mockRejectedValue(error);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));

    await act(async () => result.current.actions.saveRuntimeConfig(runtimeDraft()));

    expect(result.current.runtimeEditor).not.toBeNull();
    expect(result.current.runtimeFailure).toBe(failure);
    expect(loadRuntime).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result.current)).not.toContain('raw ');
  });

  it('does not let a late runtime completion publish into a newer semantic query', async () => {
    const write = deferred<ReturnType<typeof runtimeConfig>>();
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockResolvedValueOnce(page(0, [collector('west')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    saveRuntime.mockReturnValue(write.promise);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    let submission: Promise<void> | undefined;
    act(() => {
      submission = result.current.actions.saveRuntimeConfig(runtimeDraft());
      void submission;
    });
    await waitFor(() => expect(saveRuntime).toHaveBeenCalledTimes(1));

    act(() => void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west'));
    await waitFor(() => expect(result.current.query.name).toBe('west'));
    write.resolve(runtimeConfig({ revision: 8 }));
    await act(async () => submission);

    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.runtimeFailure).toBeNull();
    expect(result.current.query.name).toBe('west');
  });

  it('cancels a runtime GET without letting its late result reopen the editor', async () => {
    const read = deferred<ReturnType<typeof runtimeConfig>>();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockReturnValue(read.promise);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    let opening: Promise<void> | undefined;
    act(() => {
      opening = result.current.actions.openRuntimeConfig('edge');
      void opening;
    });
    await waitFor(() => expect(result.current.runtimeLoading).toBe(true));

    act(() => result.current.actions.cancelRuntimeConfig());
    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.runtimeFailure).toBeNull();
    read.resolve(runtimeConfig());
    await act(async () => opening);

    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.runtimeLoading).toBe(false);
  });

  it('rereads authoritative runtime config after cancel without writing the discarded draft', async () => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime
      .mockResolvedValueOnce(runtimeConfig({ environment: 'production' }))
      .mockResolvedValueOnce(runtimeConfig({ revision: 8, environment: 'staging' }));
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.cancelRuntimeConfig());
    await act(async () => result.current.actions.openRuntimeConfig('edge'));

    expect(loadRuntime).toHaveBeenCalledTimes(2);
    expect(result.current.runtimeEditor?.config).toMatchObject({ revision: 8, environment: 'staging' });
    expect(saveRuntime).not.toHaveBeenCalled();
  });

  it('does not let a cancelled Collector GET close a newer Collector editor', async () => {
    const edgeRead = deferred<ReturnType<typeof runtimeConfig>>();
    load.mockResolvedValue(page(0, [collector('edge'), collector('west')], 2));
    loadRuntime.mockImplementation(name => (name === 'edge' ? edgeRead.promise : Promise.resolve(runtimeConfig())));
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    let edgeOpening: Promise<void> | undefined;
    act(() => {
      edgeOpening = result.current.actions.openRuntimeConfig('edge');
      void edgeOpening;
    });
    await waitFor(() => expect(result.current.runtimeLoading).toBe(true));
    act(() => result.current.actions.cancelRuntimeConfig());

    await act(async () => result.current.actions.openRuntimeConfig('west'));
    expect(result.current.runtimeEditor?.record.name).toBe('west');
    edgeRead.resolve(runtimeConfig());
    await act(async () => edgeOpening);

    expect(result.current.runtimeEditor?.record.name).toBe('west');
    expect(result.current.runtimeLoading).toBe(false);
  });
});
