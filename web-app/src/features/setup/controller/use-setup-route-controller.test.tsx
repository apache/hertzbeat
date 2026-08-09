/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => {
  const cancelQueries = vi.fn();
  return {
    useQuery: vi.fn(),
    useQueryClient: vi.fn(() => ({ cancelQueries })),
    useMutation: vi.fn(),
    cancelQueries
  };
});
vi.mock('@tanstack/react-query', () => query);
const api = vi.hoisted(() => ({ loadSetupStatus: vi.fn(), unlockSetup: vi.fn() }));
vi.mock('../api/setup-api', async importOriginal => ({ ...(await importOriginal()), ...api }));

import { SetupRequestError } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import type { SetupStatus } from '../model/setup-contract';
import { useSetupRouteController } from './use-setup-route-controller';

describe('setup route controller', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    query.useQuery.mockReturnValue({ data: undefined, error: null, isPending: true, refetch });
  });

  it('owns a fresh status query before exposing any route decision', () => {
    expect(renderHook(() => useSetupRouteController()).result.current.state).toBe('loading');
    const options = query.useQuery.mock.calls[0]?.[0];
    expect(options.queryKey).toEqual(['setup', 'status']);
    expect(options.staleTime).toBe(0);
    expect(options.gcTime).toBe(0);
  });

  it('publishes locked access without configuration content', () => {
    query.useQuery.mockReturnValue({
      data: statusFixture({ access: 'locked' }),
      error: null,
      isPending: false,
      refetch
    });

    expect(renderHook(() => useSetupRouteController()).result.current).toMatchObject({
      state: 'ready',
      status: { access: 'locked' }
    });
  });

  it('clears the one-time code and refetches status after unlock', async () => {
    api.unlockSetup.mockResolvedValue({ access: 'unlocked', expiresAt: '2026-08-08T06:10:00Z' });
    const { result } = renderHook(() => useSetupRouteController());
    act(() => result.current.setUnlockCode('once-only'));

    await act(() => result.current.unlock());

    expect(api.unlockSetup).toHaveBeenCalledWith('once-only', expect.any(AbortSignal));
    expect(refetch).toHaveBeenCalledOnce();
    expect(result.current.unlockCode).toBe('');
    expect(query.useMutation).not.toHaveBeenCalled();
  });

  it('clears the code and converges status when unlock reports setup_complete', async () => {
    api.unlockSetup.mockRejectedValue(new SetupRequestError('http', 410, 'setup_complete'));
    const { result } = renderHook(() => useSetupRouteController());
    act(() => result.current.setUnlockCode('stale-code'));

    await act(() => result.current.unlock());

    expect(refetch).toHaveBeenCalledOnce();
    expect(result.current.unlockCode).toBe('');
  });

  it.each([
    ['unavailable', new SetupRequestError('unavailable'), 'unavailable'],
    ['contract', new SetupRequestError('contract'), 'contract'],
    ['unclassified HTTP', new SetupRequestError('http', 500), 'error']
  ] as const)('clears the code and exposes a safe %s failure', async (_label, failure, failureKind) => {
    api.unlockSetup.mockRejectedValue(failure);
    const { result } = renderHook(() => useSetupRouteController());
    act(() => result.current.setUnlockCode('private-code'));

    await act(() => result.current.unlock());

    expect(result.current.unlockCode).toBe('');
    expect(result.current.unlockFailureKind).toBe(failureKind);
    expect(query.useMutation).not.toHaveBeenCalled();
  });

  it.each([
    ['contract', new SetupContractError()],
    ['unknown', new Error('unknown write result')]
  ] as const)('suppresses a stale %s failure when authoritative unlock status advanced', async (_label, failure) => {
    api.unlockSetup.mockRejectedValue(failure);
    refetch.mockResolvedValue({ data: statusFixture({ access: 'unlocked' }), error: null });
    const { result } = renderHook(() => useSetupRouteController());
    act(() => result.current.setUnlockCode('private-code'));

    await act(() => result.current.unlock());

    expect(refetch).toHaveBeenCalledOnce();
    expect(result.current.unlockFailureKind).toBeNull();
  });

  it('maps an initial status failure to an unavailable boundary', () => {
    query.useQuery.mockReturnValue({ data: undefined, error: new Error('private'), isPending: false, refetch });

    expect(renderHook(() => useSetupRouteController()).result.current).toMatchObject({
      state: 'unavailable',
      status: null,
      statusRefreshFailed: false
    });
  });

  it('preserves trusted status and exposes a safe refresh failure after a background error', () => {
    query.useQuery.mockReturnValue({ data: statusFixture(), error: new Error('private'), isPending: false, refetch });

    expect(renderHook(() => useSetupRouteController()).result.current).toMatchObject({
      state: 'ready',
      status: { phase: 'configuration_required' },
      statusRefreshFailed: true
    });
  });

  it('retires an unlock error when status advances and does not revive it after relocking', async () => {
    let currentStatus = statusFixture({ access: 'locked' });
    query.useQuery.mockImplementation(() => ({ data: currentStatus, error: null, isPending: false, refetch }));
    api.unlockSetup.mockRejectedValue(new SetupRequestError('http', 401, 'setup_code_invalid'));
    const { result, rerender } = renderHook(() => useSetupRouteController());
    act(() => result.current.setUnlockCode('stale-code'));
    await act(() => result.current.unlock());
    expect(result.current.unlockErrorCode).toBe('setup_code_invalid');

    currentStatus = statusFixture({ access: 'unlocked', observedAt: '2026-08-08T06:00:01Z' });
    rerender();
    expect(result.current.unlockErrorCode).toBeNull();
    expect(result.current.unlockFailureKind).toBeNull();

    currentStatus = statusFixture({ access: 'locked', observedAt: '2026-08-08T06:10:00Z' });
    rerender();
    expect(result.current.unlockErrorCode).toBeNull();
  });
});

function statusFixture(overrides: Partial<SetupStatus> = {}): SetupStatus {
  return {
    phase: 'configuration_required',
    observedAt: '2026-08-08T06:00:00Z',
    access: 'local',
    applyMode: 'managed_write',
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: { kind: 'h2', configured: false, source: 'built_in_default', restartRequired: false },
    telemetryStore: { kind: 'greptime', configured: false, source: 'built_in_default', restartRequired: false },
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
