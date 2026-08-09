/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({ useMutation: vi.fn() }));
vi.mock('@tanstack/react-query', () => query);
const api = vi.hoisted(() => {
  class SetupRequestError extends Error {
    constructor(
      readonly kind: 'unavailable' | 'http' | 'contract',
      readonly status?: number,
      readonly errorCode?: string
    ) {
      super('Setup request failed');
    }
  }
  return { createSetupAdministrator: vi.fn(), SetupRequestError };
});
vi.mock('../api/setup-api', () => api);

import { useSetupAdministratorController } from './use-setup-administrator-controller';
import type { SetupStatus } from '../model/setup-contract';

describe('useSetupAdministratorController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks mismatched confirmation before the request boundary', async () => {
    const { result } = renderHook(() => useSetupAdministratorController(statusFixture(), vi.fn()));
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('secret');
      result.current.setConfirmPassword('different');
    });

    await act(() => result.current.submit());

    expect(api.createSetupAdministrator).not.toHaveBeenCalled();
    expect(result.current.confirmationMismatch).toBe(true);
  });

  it('single-flights same-tick submissions, clears secrets on success, and refetches status', async () => {
    let resolveCreate: ((value: { username: string; phase: 'optional_configuration' }) => void) | undefined;
    api.createSetupAdministrator.mockImplementation(() => new Promise(resolve => (resolveCreate = resolve)));
    const refetchStatus = vi.fn().mockResolvedValue(refreshSucceeded(statusFixture()));
    const { result } = renderHook(() => useSetupAdministratorController(statusFixture(), refetchStatus));
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('request-secret');
      result.current.setConfirmPassword('request-secret');
    });

    act(() => {
      void result.current.submit();
      void result.current.submit();
    });

    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
    expect(api.createSetupAdministrator).toHaveBeenCalledWith(
      { username: 'operator', password: 'request-secret' },
      expect.any(AbortSignal)
    );
    expect(query.useMutation).not.toHaveBeenCalled();

    act(() => resolveCreate?.({ username: 'operator', phase: 'optional_configuration' }));
    await act(() => Promise.resolve());
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(refetchStatus).toHaveBeenCalledOnce();
  });

  it('retains retry secrets and exposes only stable failure evidence', async () => {
    api.createSetupAdministrator.mockRejectedValue(
      new api.SetupRequestError('http', 409, 'administrator_username_invalid')
    );
    const { result } = renderHook(() => useSetupAdministratorController(statusFixture(), vi.fn()));
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('retry-secret');
      result.current.setConfirmPassword('retry-secret');
    });

    await act(() => result.current.submit());

    expect(result.current.password).toBe('retry-secret');
    expect(result.current.confirmPassword).toBe('retry-secret');
    expect(result.current.failure).toMatchObject({ failure: 'error', errorCode: 'administrator_username_invalid' });
  });

  it('retires secrets and rereads status before admitting a retry after an uncertain write', async () => {
    api.createSetupAdministrator.mockRejectedValue(new api.SetupRequestError('unavailable'));
    const refetchStatus = vi
      .fn()
      .mockResolvedValue(refreshSucceeded(statusFixture({ observedAt: '2026-08-08T06:00:01Z' })));
    const { result } = renderHook(() => useSetupAdministratorController(statusFixture(), refetchStatus));
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('uncertain-secret');
      result.current.setConfirmPassword('uncertain-secret');
    });

    await act(() => result.current.submit());
    await act(() => result.current.submit());

    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
    expect(refetchStatus).toHaveBeenCalledOnce();
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.canSubmit).toBe(false);
  });

  it('keeps administrator admission closed after an unchanged uncertain-write reread', async () => {
    api.createSetupAdministrator.mockRejectedValue(new api.SetupRequestError('unavailable'));
    const unchanged = statusFixture();
    const refetchStatus = vi.fn().mockResolvedValue(refreshSucceeded(unchanged));
    const { result } = renderHook(() => useSetupAdministratorController(unchanged, refetchStatus));
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('first-secret');
      result.current.setConfirmPassword('first-secret');
    });
    await act(() => result.current.submit());
    act(() => {
      result.current.setPassword('must-not-replay');
      result.current.setConfirmPassword('must-not-replay');
    });
    await act(() => result.current.submit());

    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
    expect(result.current.canSubmit).toBe(false);
  });

  it('aborts the secret-bearing administrator write on unmount', () => {
    let requestSignal: AbortSignal | undefined;
    api.createSetupAdministrator.mockImplementation((_request, signal) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    const { result, unmount } = renderHook(() => useSetupAdministratorController(statusFixture(), vi.fn()));
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('unmount-secret');
      result.current.setConfirmPassword('unmount-secret');
    });
    act(() => void result.current.submit());

    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it('rereads already-configured authority and refuses another administrator write', async () => {
    api.createSetupAdministrator.mockRejectedValue(
      new api.SetupRequestError('http', 409, 'administrator_already_configured')
    );
    const refetchStatus = vi
      .fn()
      .mockResolvedValue(
        refreshSucceeded(statusFixture({ phase: 'optional_configuration', administratorConfigured: true }))
      );
    const { result } = renderHook(() => useSetupAdministratorController(statusFixture(), refetchStatus));
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('first-secret');
      result.current.setConfirmPassword('first-secret');
    });
    await act(() => result.current.submit());

    act(() => {
      result.current.setPassword('retry-secret');
      result.current.setConfirmPassword('retry-secret');
    });
    await act(() => result.current.submit());

    expect(refetchStatus).toHaveBeenCalledOnce();
    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
  });

  it('keeps admission closed when a later administrator status changes only its timestamp', async () => {
    api.createSetupAdministrator.mockRejectedValue(
      new api.SetupRequestError('http', 409, 'administrator_already_configured')
    );
    const refetchStatus = vi.fn().mockResolvedValue({ succeeded: false as const, status: null });
    const { result, rerender } = renderHook(({ status }) => useSetupAdministratorController(status, refetchStatus), {
      initialProps: { status: statusFixture() }
    });
    act(() => {
      result.current.setUsername('operator');
      result.current.setPassword('first-secret');
      result.current.setConfirmPassword('first-secret');
    });
    await act(() => result.current.submit());

    rerender({ status: statusFixture({ observedAt: '2026-08-09T00:00:01Z' }) });
    act(() => {
      result.current.setPassword('retry-secret');
      result.current.setConfirmPassword('retry-secret');
    });
    await act(() => result.current.submit());

    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
    expect(result.current.canSubmit).toBe(false);
  });
});

function statusFixture(overrides: Partial<SetupStatus> = {}): SetupStatus {
  return {
    phase: 'administrator_required',
    observedAt: '2026-08-08T06:00:00Z',
    access: 'local',
    applyMode: 'managed_write',
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: { kind: 'h2', configured: true, source: 'ui_managed', restartRequired: false },
    telemetryStore: { kind: 'greptime', configured: true, source: 'ui_managed', restartRequired: false },
    administratorConfigured: false,
    optional: {
      publicBaseUrlConfigured: false,
      serverOtlpHttpConfigured: false,
      serverOtlpGrpcConfigured: false,
      retentionConfigured: false,
      mailConfigured: false
    },
    pendingWarnings: [],
    ...overrides
  };
}

function refreshSucceeded(status: SetupStatus) {
  return { succeeded: true as const, status };
}
