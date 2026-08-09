/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSetupStatusConvergence } from './use-setup-status-convergence';

describe('useSetupStatusConvergence', () => {
  afterEach(() => vi.useRealTimers());

  it('waits for each status request before scheduling the next bounded retry', async () => {
    vi.useFakeTimers();
    let resolveFirst: (() => void) | undefined;
    const refetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ReturnType<typeof refreshSucceeded>>(
            resolve => (resolveFirst = () => resolve(refreshSucceeded()))
          )
      )
      .mockResolvedValue(refreshSucceeded());
    const acknowledgement = {
      operationId: 'restart-1',
      state: 'awaiting_restart' as const,
      phase: 'application_starting' as const,
      nextPollAfterMillis: 20,
      exportAvailable: false
    };
    const { unmount } = renderHook(() =>
      useSetupStatusConvergence(acknowledgement, 'configuration_required', null, refetch)
    );

    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(refetch).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(refetch).toHaveBeenCalledOnce();

    act(() => resolveFirst?.());
    await act(() => Promise.resolve());
    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(refetch).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refetch).toHaveBeenCalledTimes(2);

    unmount();
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('resumes convergence after refresh from the server phase and stable restart operation', async () => {
    vi.useFakeTimers();
    const refetch = vi.fn().mockResolvedValue(refreshSucceeded());
    renderHook(() =>
      useSetupStatusConvergence(
        null,
        'application_starting',
        { state: 'awaiting_restart', nextPollAfterMillis: 25 },
        refetch
      )
    );

    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(refetch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('polls status for a locally acknowledged external apply operation', async () => {
    vi.useFakeTimers();
    const refetch = vi.fn().mockResolvedValue(refreshSucceeded());
    const acknowledgement = {
      operationId: 'external-1',
      state: 'awaiting_external_apply' as const,
      phase: 'external_apply_required' as const,
      nextPollAfterMillis: 500,
      exportAvailable: true
    };
    renderHook(() => useSetupStatusConvergence(acknowledgement, 'external_apply_required', null, refetch));

    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(refetch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('polls authoritative application-starting status without operation evidence', async () => {
    vi.useFakeTimers();
    const refetch = vi.fn().mockResolvedValue(refreshSucceeded());
    renderHook(() => useSetupStatusConvergence(null, 'application_starting', null, refetch));

    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(refetch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('does not poll an external refresh that has no local acknowledgement', async () => {
    vi.useFakeTimers();
    const refetch = vi.fn().mockResolvedValue(refreshSucceeded());
    renderHook(() => useSetupStatusConvergence(null, 'external_apply_required', null, refetch));

    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(refetch).not.toHaveBeenCalled();
  });

  it('continues bounded convergence after a rejected status refetch', async () => {
    vi.useFakeTimers();
    const refetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValue(refreshSucceeded());
    renderHook(() =>
      useSetupStatusConvergence(
        null,
        'application_starting',
        { state: 'awaiting_restart', nextPollAfterMillis: 25 },
        refetch
      )
    );

    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(refetch).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(refetch).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it.each(['succeeded', 'failed', 'rolled_back'] as const)(
    'cedes status polling to terminal lifecycle ownership for %s',
    async state => {
      vi.useFakeTimers();
      const refetch = vi.fn().mockResolvedValue(refreshSucceeded());
      renderHook(() =>
        useSetupStatusConvergence(
          {
            operationId: 'terminal-1',
            state: 'awaiting_restart',
            phase: 'application_starting',
            nextPollAfterMillis: 20,
            exportAvailable: false
          },
          'application_starting',
          { state, nextPollAfterMillis: 0 },
          refetch
        )
      );

      await act(() => vi.advanceTimersByTimeAsync(5_000));
      expect(refetch).not.toHaveBeenCalled();
    }
  );
});

function refreshSucceeded() {
  return { succeeded: true as const, status: {} as never };
}
