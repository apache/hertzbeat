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
  saveRuntime,
  wrapper
} from './use-collector-controller-test-support';

describe('useCollectorController FileLog sources', () => {
  beforeEach(resetCollectorControllerFixture);
  afterEach(clearCollectorControllerFixture);

  it('edits FileLog sources and preserves core and Prometheus through proven persistence', async () => {
    const current = runtimeConfig();
    const update = runtimeConfig({
      revision: 8,
      fileLogSources: [{ name: 'checkout', pathProfile: 'checkout-logs' }]
    });
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValueOnce(current).mockResolvedValueOnce(update);
    saveRuntime.mockResolvedValue(update);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));

    act(() => result.current.actions.openFileLogSources());
    expect(result.current.fileLogEditor).toMatchObject({
      record: { name: 'edge' },
      selection: null,
      sources: [{ name: 'payments', pathProfile: 'payments-logs' }]
    });
    act(() => result.current.actions.selectFileLogSource(0));
    act(() => result.current.actions.applyFileLogSource({ name: 'checkout', pathProfile: 'checkout-logs' }));
    await act(async () => result.current.actions.saveFileLogSources());

    expect(saveRuntime).toHaveBeenCalledWith('edge', update);
    expect(saveRuntime.mock.calls[0]?.[1]).toMatchObject({
      environment: current.environment,
      hostMetricsScrapers: current.hostMetricsScrapers,
      prometheusTargets: current.prometheusTargets
    });
    expect(result.current.fileLogEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.fileLogFailure).toBeNull();
  });

  it('keeps FileLog open when proof differs and classifies write failures without raw detail', async () => {
    const current = runtimeConfig();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(current);
    saveRuntime.mockResolvedValue(current);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openFileLogSources());

    await act(async () => result.current.actions.saveFileLogSources());

    expect(result.current.fileLogEditor).not.toBeNull();
    expect(result.current.fileLogFailure).toBe('validation');
    saveRuntime.mockRejectedValue(new ApiMessageError('raw forbidden detail', { status: 403 }));
    await act(async () => result.current.actions.saveFileLogSources());
    expect(result.current.fileLogFailure).toBe('permission');
    expect(JSON.stringify(result.current)).not.toContain('raw forbidden detail');
  });

  it('preserves FileLog list order across add/remove/cancel and enforces duplicate and max-16 validation', async () => {
    const sources = Array.from({ length: 16 }, (_, index) => ({
      name: `source-${index}`,
      pathProfile: `profile-${index}`
    }));
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig({ fileLogSources: sources }));
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openFileLogSources());

    act(() => result.current.actions.selectFileLogSource('new'));
    expect(result.current.fileLogEditor?.selection).toBeNull();
    act(() => result.current.actions.selectFileLogSource(1));
    act(() => result.current.actions.cancelFileLogSource());
    expect(result.current.fileLogEditor?.sources).toEqual(sources);
    act(() => result.current.actions.selectFileLogSource(1));
    act(() => result.current.actions.applyFileLogSource({ name: 'source-0', pathProfile: 'duplicate-profile' }));
    expect(result.current.fileLogFailure).toBe('validation');
    expect(result.current.fileLogEditor?.selection).toBe(1);
    act(() => result.current.actions.removeFileLogSource(1));
    expect(result.current.fileLogEditor?.sources.map(source => source.name)).toEqual([
      'source-0',
      ...sources.slice(2).map(source => source.name)
    ]);
  });

  it('keeps Prometheus and FileLog mutually exclusive and distinguishes Back from modal close', async () => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => {
      result.current.actions.openPrometheusSources();
      result.current.actions.openFileLogSources();
    });
    expect(result.current.fileLogEditor).toBeNull();
    act(() => result.current.actions.cancelPrometheusSources());
    act(() => {
      result.current.actions.openFileLogSources();
      result.current.actions.openPrometheusSources();
    });
    expect(result.current.prometheusEditor).toBeNull();

    act(() => result.current.actions.cancelFileLogSources());
    expect(result.current.fileLogEditor).toBeNull();
    expect(result.current.runtimeEditor).not.toBeNull();
    act(() => result.current.actions.openFileLogSources());
    act(() => result.current.actions.closeFileLogSources());
    expect(result.current.fileLogEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
  });

  it('does not retain source ownership when opening without a Runtime session fails', async () => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.openPrometheusSources());
    expect(result.current.prometheusEditor).toBeNull();
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openFileLogSources());

    expect(result.current.fileLogEditor).not.toBeNull();
    expect(result.current.prometheusEditor).toBeNull();
  });

  it('does not write FileLog after pre-save navigation and closes stale state after an in-flight write', async () => {
    const write = deferred<ReturnType<typeof runtimeConfig>>();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    saveRuntime.mockReturnValue(write.promise);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openFileLogSources());
    act(() => void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west'));
    await waitFor(() => expect(result.current.query.name).toBe('west'));
    await act(async () => result.current.actions.saveFileLogSources());
    expect(saveRuntime).not.toHaveBeenCalled();

    act(() => void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8'));
    await waitFor(() => expect(result.current.query.name).toBe(''));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openFileLogSources());
    let submission: Promise<void> | undefined;
    act(() => {
      submission = result.current.actions.saveFileLogSources();
      void submission;
    });
    await waitFor(() => expect(saveRuntime).toHaveBeenCalledTimes(1));
    act(() => void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west'));
    write.resolve(runtimeConfig({ revision: 8 }));
    await act(async () => submission);
    expect(result.current.fileLogEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
  });
});
