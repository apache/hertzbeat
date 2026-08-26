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
  prometheusDraft,
  resetCollectorControllerFixture,
  runtimeConfig,
  saveRuntime,
  wrapper
} from './use-collector-controller-test-support';

describe('useCollectorController Prometheus sources', () => {
  beforeEach(resetCollectorControllerFixture);
  afterEach(clearCollectorControllerFixture);

  it('edits Prometheus sources in a dedicated session and preserves core and FileLog through proven persistence', async () => {
    const current = runtimeConfig();
    const update = runtimeConfig({
      revision: 8,
      prometheusTargets: [
        {
          name: 'checkout',
          endpoint: 'https://checkout.example.test:9464/metrics',
          interval: 'PT45S',
          timeout: 'PT5S',
          headerSecretRefs: { 'X-Scrape-Key': 'checkout-key-ref' },
          tlsCaProfile: 'internal-ca'
        }
      ]
    });
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValueOnce(current).mockResolvedValueOnce(update);
    saveRuntime.mockResolvedValue(update);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));

    act(() => result.current.actions.openPrometheusSources());
    expect(result.current.prometheusEditor).toMatchObject({
      record: { name: 'edge' },
      selection: null,
      targets: [{ name: 'payments', headerSecretRefs: [{ secretReferenceName: 'payments-key-ref' }] }]
    });
    act(() => result.current.actions.selectPrometheusTarget(0));
    act(() =>
      result.current.actions.applyPrometheusTarget(
        prometheusDraft({
          name: 'checkout',
          endpoint: 'https://checkout.example.test:9464/metrics',
          intervalSeconds: 45,
          timeoutSeconds: 5,
          headerSecretRefs: [{ headerName: 'X-Scrape-Key', secretReferenceName: 'checkout-key-ref' }],
          tlsCaProfile: 'internal-ca'
        })
      )
    );
    await act(async () => result.current.actions.savePrometheusSources());

    expect(saveRuntime).toHaveBeenCalledWith('edge', update);
    expect(saveRuntime.mock.calls[0]?.[1]).toMatchObject({
      environment: current.environment,
      hostMetricsScrapers: current.hostMetricsScrapers,
      fileLogSources: current.fileLogSources
    });
    expect(result.current.prometheusEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.prometheusFailure).toBeNull();
  });

  it('keeps the Prometheus source session open when request, response, and authoritative GET do not agree', async () => {
    const current = runtimeConfig();
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(current);
    saveRuntime.mockResolvedValue(current);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openPrometheusSources());

    await act(async () => result.current.actions.savePrometheusSources());

    expect(result.current.prometheusEditor).not.toBeNull();
    expect(result.current.runtimeEditor).not.toBeNull();
    expect(result.current.prometheusFailure).toBe('validation');
  });

  it('appends, removes the exact target, preserves order, and cancels an edit without changing drafts', async () => {
    const current = runtimeConfig({
      prometheusTargets: [
        runtimeConfig().prometheusTargets[0]!,
        {
          ...runtimeConfig().prometheusTargets[0]!,
          name: 'checkout',
          endpoint: 'https://checkout.example.test/metrics'
        }
      ]
    });
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(current);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openPrometheusSources());

    const original = result.current.prometheusEditor?.targets;
    act(() => result.current.actions.selectPrometheusTarget(0));
    act(() => result.current.actions.cancelPrometheusTarget());
    expect(result.current.prometheusEditor).toMatchObject({ selection: null, targets: original });

    act(() => result.current.actions.selectPrometheusTarget('new'));
    act(() =>
      result.current.actions.applyPrometheusTarget(
        prometheusDraft({ name: 'orders', endpoint: 'https://orders.example.test/metrics' })
      )
    );
    expect(result.current.prometheusEditor?.targets.map(target => target.name)).toEqual([
      'payments',
      'checkout',
      'orders'
    ]);

    act(() => result.current.actions.selectPrometheusTarget(1));
    act(() => result.current.actions.removePrometheusTarget(1));
    expect(result.current.prometheusEditor).toMatchObject({ selection: null });
    expect(result.current.prometheusEditor?.targets.map(target => target.name)).toEqual(['payments', 'orders']);
  });

  it('distinguishes Back from closing the modal-owned Prometheus and Runtime sessions', async () => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openPrometheusSources());

    act(() => result.current.actions.cancelPrometheusSources());
    expect(result.current.prometheusEditor).toBeNull();
    expect(result.current.runtimeEditor).not.toBeNull();
    act(() => result.current.actions.openPrometheusSources());
    act(() => result.current.actions.closePrometheusSources());

    expect(result.current.prometheusEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
  });

  it('keeps invalid duplicate names in the selected form and enforces the 32-target add limit', async () => {
    const targets = Array.from({ length: 32 }, (_, index) => ({
      ...runtimeConfig().prometheusTargets[0]!,
      name: `target-${index}`,
      endpoint: `https://target-${index}.example.test/metrics`
    }));
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig({ prometheusTargets: targets }));
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openPrometheusSources());

    act(() => result.current.actions.selectPrometheusTarget('new'));
    expect(result.current.prometheusEditor?.selection).toBeNull();
    act(() => result.current.actions.selectPrometheusTarget(1));
    act(() => result.current.actions.applyPrometheusTarget(prometheusDraft({ name: 'target-0' })));
    expect(result.current.prometheusEditor?.selection).toBe(1);
    expect(result.current.prometheusFailure).toBe('validation');
    expect(result.current.prometheusEditor?.targets).toHaveLength(32);
  });

  it.each([
    [new ApiMessageError('raw forbidden detail', { status: 403 }), 'permission'],
    [new ApiMessageError('raw validation detail', { status: 422 }), 'validation'],
    [new ApiMessageError('raw unavailable detail', { status: 503 }), 'unavailable'],
    [new Error('raw generic detail'), 'error']
  ] as const)('classifies Prometheus source PUT failure without exposing raw state %#', async (error, failure) => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    saveRuntime.mockRejectedValue(error);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openPrometheusSources());

    await act(async () => result.current.actions.savePrometheusSources());

    expect(result.current.prometheusEditor).not.toBeNull();
    expect(result.current.prometheusFailure).toBe(failure);
    expect(JSON.stringify(result.current)).not.toContain('raw ');
  });

  it('closes stale Prometheus source state after semantic navigation during persistence', async () => {
    const write = deferred<ReturnType<typeof runtimeConfig>>();
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockResolvedValueOnce(page(0, [collector('west')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    saveRuntime.mockReturnValue(write.promise);
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openPrometheusSources());
    let submission: Promise<void> | undefined;
    act(() => {
      submission = result.current.actions.savePrometheusSources();
      void submission;
    });
    await waitFor(() => expect(saveRuntime).toHaveBeenCalledTimes(1));

    act(() => void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west'));
    await waitFor(() => expect(result.current.query.name).toBe('west'));
    write.resolve(runtimeConfig({ revision: 8 }));
    await act(async () => submission);

    expect(result.current.prometheusEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
    expect(result.current.prometheusFailure).toBeNull();
  });

  it('does not write an owned Prometheus session after navigation made it stale before Save', async () => {
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockResolvedValueOnce(page(0, [collector('west')], 1));
    loadRuntime.mockResolvedValue(runtimeConfig());
    const { result } = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(async () => result.current.actions.openRuntimeConfig('edge'));
    act(() => result.current.actions.openPrometheusSources());

    act(() => void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west'));
    await waitFor(() => expect(result.current.query.name).toBe('west'));
    await act(async () => result.current.actions.savePrometheusSources());

    expect(saveRuntime).not.toHaveBeenCalled();
    expect(result.current.prometheusEditor).toBeNull();
    expect(result.current.runtimeEditor).toBeNull();
  });
});
