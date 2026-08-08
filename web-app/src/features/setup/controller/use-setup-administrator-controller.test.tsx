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

describe('useSetupAdministratorController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks mismatched confirmation before the request boundary', async () => {
    const { result } = renderHook(() => useSetupAdministratorController(vi.fn()));
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
    const refetchStatus = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSetupAdministratorController(refetchStatus));
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
    const { result } = renderHook(() => useSetupAdministratorController(vi.fn()));
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
});
