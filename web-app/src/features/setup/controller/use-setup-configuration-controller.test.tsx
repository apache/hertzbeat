/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
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
  return {
    validateSetupSection: vi.fn(),
    configureSetup: vi.fn(),
    exportSetupConfiguration: vi.fn(),
    loadSetupOperation: vi.fn(),
    SetupRequestError
  };
});
vi.mock('../api/setup-api', () => api);
const download = vi.hoisted(() => ({ downloadSetupArtifact: vi.fn() }));
vi.mock('./setup-download', () => download);

import type { SetupStatus } from '../model/setup-contract';
import { useSetupConfigurationController } from './use-setup-configuration-controller';

describe('useSetupConfigurationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.useQuery.mockReturnValue({ data: undefined, error: null, isPending: false });
    api.validateSetupSection.mockResolvedValue(validResult());
  });
  afterEach(() => vi.useRealTimers());

  it('validates one section while retaining its password for the eventual apply', async () => {
    api.validateSetupSection.mockResolvedValue({
      valid: true,
      observedAt: '2026-08-08T06:00:00Z',
      errorCode: null,
      warnings: ['h2_non_production']
    });
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    act(() => result.current.updateManagement({ password: 'request-only' }));

    await act(() => result.current.validateSection('metadata_database'));

    expect(api.validateSetupSection).toHaveBeenCalledWith(
      {
        section: 'metadata_database',
        managementDatabase: expect.objectContaining({ password: 'request-only' })
      },
      expect.any(AbortSignal)
    );
    expect(result.current.draft.managementDatabase.password).toBe('request-only');
    expect(result.current.validation.metadata_database).toMatchObject({ state: 'complete', valid: true });
    expect(query.useMutation).not.toHaveBeenCalled();
  });

  it('handles the real managed restart acknowledgement and repeatedly refetches status', async () => {
    vi.useFakeTimers();
    api.configureSetup.mockResolvedValue({
      operationId: 'setup-1',
      state: 'awaiting_restart',
      phase: 'application_starting',
      nextPollAfterMillis: 20,
      exportAvailable: false
    });
    const onConverge = vi.fn().mockResolvedValue(refreshSucceeded(statusFixture()));
    const { result, rerender } = renderHook(({ status }) => useSetupConfigurationController(status, onConverge), {
      initialProps: { status: statusFixture() }
    });
    act(() => {
      result.current.updateManagement({ password: 'metadata-secret' });
      result.current.updateTelemetry({ password: 'telemetry-secret' });
    });
    await validateBoth(result);

    await act(() => result.current.submit());

    expect(api.configureSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedPhase: 'configuration_required',
        applyMode: 'managed_write',
        managementDatabase: expect.objectContaining({ password: 'metadata-secret' }),
        telemetryStore: expect.objectContaining({ password: 'telemetry-secret' })
      }),
      expect.any(AbortSignal)
    );
    expect(result.current.draft.managementDatabase.password).toBe('');
    expect(result.current.draft.telemetryStore.password).toBe('');
    expect(result.current.workflowState).toBe('waiting');
    expect(result.current.acknowledgement).toMatchObject({ state: 'awaiting_restart' });
    expect(query.useMutation).not.toHaveBeenCalled();
    expect(query.useQuery.mock.calls.at(-1)?.[0]).toMatchObject({ enabled: true });

    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(onConverge).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(onConverge).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(onConverge).toHaveBeenCalledTimes(2);

    rerender({ status: statusFixture({ observedAt: '2026-08-08T06:00:01Z' }) });
    expect(result.current.workflowState).toBe('waiting');
  });

  it('retains external secrets and downloads each server-rendered export without a mutation cache', async () => {
    api.configureSetup.mockResolvedValue({
      operationId: 'external-1',
      state: 'awaiting_external_apply',
      phase: 'external_apply_required',
      nextPollAfterMillis: 500,
      exportAvailable: true
    });
    api.exportSetupConfiguration.mockResolvedValue({
      blob: new Blob(['opaque']),
      fileName: 'hertzbeat-setup-secret.yml',
      mediaType: 'application/yaml'
    });
    const { result } = renderHook(() =>
      useSetupConfigurationController(statusFixture({ applyMode: 'external_apply' }), vi.fn())
    );
    act(() => {
      result.current.updateManagement({ password: 'export-metadata-secret' });
      result.current.updateTelemetry({ username: 'greptime', password: 'export-telemetry-secret' });
    });
    await validateBoth(result);
    await act(() => result.current.submit());

    expect(result.current.draft.managementDatabase.password).toBe('export-metadata-secret');
    expect(result.current.canExport).toBe(true);
    await act(() => result.current.exportConfiguration('kubernetes_secret'));
    expect(api.exportSetupConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'kubernetes_secret',
        configuration: expect.objectContaining({
          expectedPhase: 'configuration_required',
          applyMode: 'external_apply',
          managementDatabase: expect.objectContaining({ password: 'export-metadata-secret' })
        })
      }),
      expect.any(AbortSignal)
    );
    expect(download.downloadSetupArtifact).toHaveBeenCalledOnce();
    expect(query.useMutation).not.toHaveBeenCalled();
  });

  it('requires honest re-entry after refreshing an external apply and uses that server phase', async () => {
    query.useQuery.mockReturnValue({
      data: { operationId: 'external-old', state: 'awaiting_external_apply', nextPollAfterMillis: 500 },
      error: null,
      isPending: false
    });
    api.configureSetup.mockResolvedValue({
      operationId: 'external-resumed',
      state: 'awaiting_external_apply',
      phase: 'external_apply_required',
      nextPollAfterMillis: 500,
      exportAvailable: true
    });
    const { result } = renderHook(() =>
      useSetupConfigurationController(
        statusFixture({ phase: 'external_apply_required', applyMode: 'external_apply', operationId: 'external-old' }),
        vi.fn()
      )
    );

    expect(result.current.workflowState).toBe('external-resume');
    expect(result.current.draft).toEqual({
      managementDatabase: { kind: null, jdbcUrl: '', username: '', password: '' },
      telemetryStore: {
        kind: 'greptime',
        grpcEndpoints: '',
        httpEndpoint: '',
        database: '',
        username: '',
        password: ''
      }
    });
    expect(result.current.canExport).toBe(false);

    act(() => {
      result.current.updateManagement({
        kind: 'postgresql',
        jdbcUrl: 'jdbc:postgresql://db/hertzbeat',
        username: 'hertzbeat',
        password: 'reentered-metadata-secret'
      });
      result.current.updateTelemetry({
        grpcEndpoints: 'greptime:4001',
        httpEndpoint: 'http://greptime:4000',
        database: 'public',
        username: 'greptime',
        password: 'reentered-telemetry-secret'
      });
    });
    await validateBoth(result);
    await act(() => result.current.submit());

    expect(api.configureSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedPhase: 'external_apply_required',
        applyMode: 'external_apply',
        managementDatabase: expect.objectContaining({ password: 'reentered-metadata-secret' })
      }),
      expect.any(AbortSignal)
    );
    expect(result.current.workflowState).toBe('external-waiting');
    expect(result.current.canExport).toBe(true);
  });

  it('reopens a definitely rejected configuration write only after refreshed authority permits submission', async () => {
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('http', 409, 'config_write_failed'));
    const refetchStatus = vi.fn().mockResolvedValue(refreshSucceeded(statusFixture()));
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), refetchStatus));
    act(() => result.current.updateManagement({ password: 'retry-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());
    expect(refetchStatus).toHaveBeenCalledOnce();
    expect(result.current.draft.managementDatabase.password).toBe('');
    expect(result.current.submitFailure).toMatchObject({ failure: 'error', errorCode: 'config_write_failed' });

    act(() => result.current.updateManagement({ password: 'replacement-secret' }));
    await validateBoth(result);
    expect(result.current.canSubmit).toBe(true);
    await act(() => result.current.submit());
    expect(api.configureSetup).toHaveBeenCalledTimes(2);
  });

  it('reopens rejected external apply only for the corresponding awaiting operation', async () => {
    let operation = { operationId: 'other-operation', state: 'awaiting_external_apply', nextPollAfterMillis: 500 };
    query.useQuery.mockImplementation(() => ({ data: operation, error: null, isPending: false }));
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('http', 409, 'operation_conflict'));
    const externalStatus = statusFixture({
      phase: 'external_apply_required',
      applyMode: 'external_apply',
      operationId: 'external-operation'
    });
    const refetchStatus = vi.fn().mockResolvedValue(refreshSucceeded(externalStatus));
    const { result, rerender } = renderHook(({ status }) => useSetupConfigurationController(status, refetchStatus), {
      initialProps: { status: statusFixture() }
    });
    act(() => result.current.updateManagement({ password: 'first-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());

    rerender({ status: externalStatus });
    act(() => result.current.updateManagement({ password: 'replacement-secret' }));
    await validateBoth(result);
    expect(result.current.canSubmit).toBe(false);

    operation = { operationId: 'external-operation', state: 'pending', nextPollAfterMillis: 250 };
    rerender({ status: externalStatus });
    expect(result.current.canSubmit).toBe(false);

    operation = {
      operationId: 'external-operation',
      state: 'awaiting_external_apply',
      nextPollAfterMillis: 500
    };
    rerender({ status: externalStatus });
    expect(result.current.canSubmit).toBe(true);
    await act(() => result.current.submit());
    expect(api.configureSetup).toHaveBeenCalledTimes(2);
  });

  it('reopens a rejected external apply when matching operation authority was already complete', async () => {
    const externalStatus = statusFixture({
      phase: 'external_apply_required',
      applyMode: 'external_apply',
      operationId: 'external-operation'
    });
    query.useQuery.mockReturnValue({
      data: {
        operationId: 'external-operation',
        state: 'awaiting_external_apply',
        nextPollAfterMillis: 500
      },
      error: null,
      isPending: false
    });
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('http', 409, 'operation_conflict'));
    const refetchStatus = vi.fn().mockResolvedValue(refreshSucceeded(externalStatus));
    const { result } = renderHook(() => useSetupConfigurationController(externalStatus, refetchStatus));
    act(() => {
      result.current.updateManagement({
        kind: 'postgresql',
        jdbcUrl: 'jdbc:postgresql://db/hertzbeat',
        username: 'hertzbeat',
        password: 'first-secret'
      });
      result.current.updateTelemetry({
        grpcEndpoints: 'greptime:4001',
        httpEndpoint: 'http://greptime:4000',
        database: 'public'
      });
    });
    await validateBoth(result);
    await act(() => result.current.submit());

    act(() => result.current.updateManagement({ password: 'replacement-secret' }));
    await validateBoth(result);
    expect(result.current.canSubmit).toBe(true);
    await act(() => result.current.submit());
    expect(api.configureSetup).toHaveBeenCalledTimes(2);
  });

  it('keeps configuration admission closed through the acknowledged operation lifecycle', async () => {
    api.configureSetup.mockResolvedValue({
      operationId: 'running-1',
      state: 'running',
      phase: 'application_starting',
      nextPollAfterMillis: 500,
      exportAvailable: false
    });
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    act(() => result.current.updateManagement({ password: 'request-secret' }));
    await validateBoth(result);

    await act(() => result.current.submit());
    await act(() => result.current.submit());

    expect(api.configureSetup).toHaveBeenCalledOnce();
    expect(result.current.canSubmit).toBe(false);
  });

  it('retires secrets and forces authoritative status reread after an uncertain configuration outcome', async () => {
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('unavailable'));
    const refetchStatus = vi
      .fn()
      .mockResolvedValue(refreshSucceeded(statusFixture({ observedAt: '2026-08-08T06:00:01Z' })));
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), refetchStatus));
    act(() => {
      result.current.updateManagement({ password: 'uncertain-metadata-secret' });
      result.current.updateTelemetry({ username: 'greptime', password: 'uncertain-telemetry-secret' });
    });
    await validateBoth(result);

    await act(() => result.current.submit());
    await act(() => result.current.submit());

    expect(api.configureSetup).toHaveBeenCalledOnce();
    expect(refetchStatus).toHaveBeenCalledOnce();
    expect(result.current.draft.managementDatabase.password).toBe('');
    expect(result.current.draft.telemetryStore.password).toBe('');
    expect(result.current.canSubmit).toBe(false);
  });

  it('keeps admission closed when an uncertain write rereads the same authority fingerprint', async () => {
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('unavailable'));
    const unchanged = statusFixture();
    const refetchStatus = vi.fn().mockResolvedValue(refreshSucceeded(unchanged));
    const { result } = renderHook(() => useSetupConfigurationController(unchanged, refetchStatus));
    act(() => result.current.updateManagement({ password: 'uncertain-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());

    act(() => result.current.updateManagement({ password: 'must-not-replay' }));
    await validateBoth(result);
    await act(() => result.current.submit());

    expect(api.configureSetup).toHaveBeenCalledOnce();
    expect(result.current.canSubmit).toBe(false);
  });

  it('retires external-apply secrets when the authoritative phase remounts the controller', async () => {
    api.configureSetup.mockResolvedValue({
      operationId: 'external-1',
      state: 'awaiting_external_apply',
      phase: 'external_apply_required',
      nextPollAfterMillis: 500,
      exportAvailable: true
    });
    const first = renderHook(() =>
      useSetupConfigurationController(statusFixture({ applyMode: 'external_apply' }), vi.fn())
    );
    act(() => {
      first.result.current.updateManagement({ password: 'external-metadata-secret' });
      first.result.current.updateTelemetry({ username: 'greptime', password: 'external-telemetry-secret' });
    });
    await validateBoth(first.result);
    await act(() => first.result.current.submit());
    expect(first.result.current.canExport).toBe(true);
    first.unmount();

    const converged = renderHook(() =>
      useSetupConfigurationController(
        statusFixture({
          phase: 'external_apply_required',
          applyMode: 'external_apply',
          operationId: 'external-1',
          observedAt: '2026-08-08T06:00:01Z'
        }),
        vi.fn()
      )
    );

    expect(converged.result.current.draft.managementDatabase.password).toBe('');
    expect(converged.result.current.draft.telemetryStore.password).toBe('');
    expect(converged.result.current.canExport).toBe(false);
  });

  it('resets only the edited section evidence and closes the apply gate', async () => {
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    await validateBoth(result);
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.updateTelemetry({ database: 'updated' }));
    expect(result.current.validation.metadata_database.state).toBe('complete');
    expect(result.current.validation.telemetry_store.state).toBe('idle');
    expect(result.current.canSubmit).toBe(false);
  });

  it('discards validation evidence returned for a draft that changed in flight', async () => {
    let resolveValidation: ((result: ReturnType<typeof validResult>) => void) | undefined;
    api.validateSetupSection.mockImplementationOnce(
      () => new Promise<ReturnType<typeof validResult>>(resolve => (resolveValidation = resolve))
    );
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    act(() => result.current.updateManagement({ jdbcUrl: 'jdbc:h2:./before' }));
    act(() => void result.current.validateSection('metadata_database'));
    expect(result.current.validation.metadata_database.state).toBe('checking');

    act(() => result.current.updateManagement({ jdbcUrl: 'jdbc:h2:./after' }));
    expect(result.current.validation.metadata_database.state).toBe('idle');
    await act(async () => {
      resolveValidation?.(validResult());
      await Promise.resolve();
    });

    expect(result.current.validation.metadata_database.state).toBe('idle');
    expect(result.current.canSubmit).toBe(false);
    await act(() => result.current.validateSection('metadata_database'));
    expect(result.current.validation.metadata_database.state).toBe('complete');
  });

  it('validates the edited draft when a new validation starts before React rerenders', async () => {
    const pending: Array<(result: ReturnType<typeof validResult>) => void> = [];
    api.validateSetupSection.mockImplementation(
      () => new Promise<ReturnType<typeof validResult>>(resolve => pending.push(resolve))
    );
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    act(() => result.current.updateManagement({ jdbcUrl: 'jdbc:h2:./before' }));
    act(() => void result.current.validateSection('metadata_database'));

    act(() => {
      result.current.updateManagement({ jdbcUrl: 'jdbc:h2:./after' });
      void result.current.validateSection('metadata_database');
    });

    expect(api.validateSetupSection).toHaveBeenCalledTimes(2);
    expect(api.validateSetupSection.mock.calls[1]?.[0]).toMatchObject({
      managementDatabase: { jdbcUrl: 'jdbc:h2:./after' }
    });
    await act(async () => {
      pending[1]?.(validResult());
      pending[0]?.(validResult());
      await Promise.resolve();
    });
    expect(result.current.validation.metadata_database).toMatchObject({ state: 'complete', valid: true });
  });

  it('aborts an in-flight write when the setup step unmounts', () => {
    let requestSignal: AbortSignal | undefined;
    api.validateSetupSection.mockImplementation((_request, signal) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    const { result, unmount } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    act(() => void result.current.validateSection('metadata_database'));
    unmount();
    expect(requestSignal?.aborted).toBe(true);
  });

  it('aborts a secret-bearing configuration write when the setup step unmounts', async () => {
    let requestSignal: AbortSignal | undefined;
    api.configureSetup.mockImplementation((_request, signal) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    const { result, unmount } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    act(() => result.current.updateManagement({ password: 'unmount-secret' }));
    await validateBoth(result);
    act(() => void result.current.submit());

    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it('surfaces operation polling failures as safe workflow evidence', () => {
    api.loadSetupOperation.mockRejectedValue(new Error('not rendered'));
    query.useQuery.mockReturnValue({ data: undefined, error: new Error('poll failed'), isPending: false });
    const { result } = renderHook(() =>
      useSetupConfigurationController(statusFixture({ operationId: 'existing-op' }), vi.fn())
    );
    expect(result.current.workflowState).toBe('poll-error');
  });

  it.each(['awaiting_restart', 'awaiting_external_apply'] as const)(
    'stops operation polling for stable state %s',
    state => {
      query.useQuery.mockReturnValue({
        data: { state, nextPollAfterMillis: 750 },
        error: null,
        isPending: false
      });
      renderHook(() => useSetupConfigurationController(statusFixture({ operationId: 'existing-op' }), vi.fn()));
      const options = query.useQuery.mock.calls[0]?.[0];

      expect(options.queryKey).toEqual(['setup', 'operation', 'existing-op']);
      expect(options.enabled).toBe(true);
      expect(options.refetchInterval({ state: { data: { state, nextPollAfterMillis: 750 } } })).toBe(false);
    }
  );

  it('clamps an active operation zero poll hint to a positive minimum', () => {
    query.useQuery.mockReturnValue({
      data: { state: 'running', nextPollAfterMillis: 0 },
      error: null,
      isPending: false
    });
    renderHook(() => useSetupConfigurationController(statusFixture({ operationId: 'existing-op' }), vi.fn()));
    const options = query.useQuery.mock.calls[0]?.[0];

    expect(
      options.refetchInterval({
        state: {
          data: { state: 'running', nextPollAfterMillis: 0 },
          error: null,
          errorUpdateCount: 0
        }
      })
    ).toBe(250);
  });

  it.each(['pending', 'running'] as const)('blocks submission for an authoritative %s operation', async state => {
    query.useQuery.mockReturnValue({ data: { state, nextPollAfterMillis: 250 }, error: null, isPending: false });
    const { result } = renderHook(() =>
      useSetupConfigurationController(statusFixture({ operationId: 'active-operation' }), vi.fn())
    );
    act(() => result.current.updateManagement({ password: 'must-not-submit' }));
    await validateBoth(result);

    await act(() => result.current.submit());

    expect(result.current.canSubmit).toBe(false);
    expect(api.configureSetup).not.toHaveBeenCalled();
  });

  it('directly reopens only an explicit input rejection', async () => {
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('http', 400, 'invalid_request'));
    const refetchStatus = vi.fn();
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), refetchStatus));
    act(() => result.current.updateManagement({ password: 'input-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());
    await act(() => result.current.submit());

    expect(refetchStatus).not.toHaveBeenCalled();
    expect(result.current.draft.managementDatabase.password).toBe('input-secret');
    expect(api.configureSetup).toHaveBeenCalledTimes(2);
  });

  it('forces authoritative reread when an operation succeeds', async () => {
    const refetchStatus = vi
      .fn()
      .mockResolvedValue(refreshSucceeded(statusFixture({ phase: 'administrator_required' })));
    query.useQuery.mockReturnValue({
      data: { state: 'succeeded', nextPollAfterMillis: 0 },
      error: null,
      isPending: false
    });

    renderHook(() =>
      useSetupConfigurationController(statusFixture({ operationId: 'completed-operation' }), refetchStatus)
    );

    await act(() => Promise.resolve());
    expect(refetchStatus).toHaveBeenCalledOnce();
  });

  it('uses bounded backoff after failed terminal authority refreshes without replaying the write', async () => {
    vi.useFakeTimers();
    const refetchStatus = vi
      .fn()
      .mockResolvedValueOnce(refreshFailed())
      .mockResolvedValueOnce(refreshFailed())
      .mockResolvedValueOnce(refreshSucceeded(statusFixture({ phase: 'administrator_required' })));
    query.useQuery.mockReturnValue({
      data: { state: 'succeeded', nextPollAfterMillis: 0 },
      error: null,
      isPending: false
    });
    renderHook(() =>
      useSetupConfigurationController(statusFixture({ operationId: 'completed-operation' }), refetchStatus)
    );

    await act(() => Promise.resolve());
    expect(refetchStatus).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(refetchStatus).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refetchStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(refetchStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refetchStatus).toHaveBeenCalledTimes(3);
    expect(api.configureSetup).not.toHaveBeenCalled();
  });

  it.each(['failed', 'rolled_back'] as const)(
    'clears failed operation state and admits a proven configuration retry for %s',
    async state => {
      api.configureSetup
        .mockResolvedValueOnce({
          operationId: 'terminal-operation',
          state: 'pending',
          phase: 'application_starting',
          nextPollAfterMillis: 250,
          exportAvailable: false
        })
        .mockResolvedValueOnce({
          operationId: 'retry-operation',
          state: 'pending',
          phase: 'application_starting',
          nextPollAfterMillis: 250,
          exportAvailable: false
        });
      query.useQuery.mockReturnValue({ data: { state, nextPollAfterMillis: 0 }, error: null, isPending: false });
      const refetchStatus = vi.fn().mockResolvedValue(refreshSucceeded(statusFixture()));
      const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), refetchStatus));
      act(() => result.current.updateManagement({ password: 'first-secret' }));
      await validateBoth(result);
      await act(() => result.current.submit());
      await act(() => Promise.resolve());

      expect(refetchStatus).toHaveBeenCalledOnce();
      expect(result.current.acknowledgement).toBeNull();
      expect(result.current.draft.managementDatabase.password).toBe('');
      expect(result.current.validation.metadata_database.state).toBe('idle');

      act(() => result.current.updateManagement({ password: 'retry-secret' }));
      await validateBoth(result);
      await act(() => result.current.submit());
      expect(api.configureSetup).toHaveBeenCalledTimes(2);
    }
  );

  it('retires failed-operation secrets immediately but converges until authority leaves that operation', async () => {
    vi.useFakeTimers();
    let resolveFirstRefresh: ((result: ReturnType<typeof refreshSucceeded>) => void) | undefined;
    const refetchStatus = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<ReturnType<typeof refreshSucceeded>>(resolve => (resolveFirstRefresh = resolve))
      )
      .mockResolvedValueOnce(refreshSucceeded(statusFixture({ operationId: 'terminal-operation' })))
      .mockResolvedValueOnce(refreshSucceeded(statusFixture({ observedAt: '2026-08-09T00:00:01Z' })));
    api.configureSetup.mockResolvedValue({
      operationId: 'terminal-operation',
      state: 'pending',
      phase: 'application_starting',
      nextPollAfterMillis: 250,
      exportAvailable: false
    });
    query.useQuery.mockReturnValue({
      data: { state: 'failed', nextPollAfterMillis: 0 },
      error: null,
      isPending: false
    });
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), refetchStatus));
    act(() => result.current.updateManagement({ password: 'retire-immediately' }));
    await validateBoth(result);
    await act(() => result.current.submit());

    expect(result.current.draft.managementDatabase.password).toBe('');
    expect(result.current.acknowledgement?.operationId).toBe('terminal-operation');
    act(() => resolveFirstRefresh?.(refreshSucceeded(statusFixture({ operationId: 'terminal-operation' }))));
    await act(() => Promise.resolve());
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(refetchStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(refetchStatus).toHaveBeenCalledTimes(3);
    expect(result.current.acknowledgement).toBeNull();
  });

  it('rereads operation-conflict authority and refuses retry while an operation remains active', async () => {
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('http', 409, 'operation_conflict'));
    const refetchStatus = vi
      .fn()
      .mockResolvedValue(refreshSucceeded(statusFixture({ operationId: 'active-operation' })));
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), refetchStatus));
    act(() => result.current.updateManagement({ password: 'first-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());

    act(() => result.current.updateManagement({ password: 'retry-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());

    expect(refetchStatus).toHaveBeenCalledOnce();
    expect(api.configureSetup).toHaveBeenCalledOnce();
  });

  it('keeps admission closed when a later configuration status changes only its timestamp', async () => {
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('http', 409, 'operation_conflict'));
    const refetchStatus = vi.fn().mockRejectedValue(new Error('status unavailable'));
    const { result, rerender } = renderHook(({ status }) => useSetupConfigurationController(status, refetchStatus), {
      initialProps: { status: statusFixture() }
    });
    act(() => result.current.updateManagement({ password: 'first-secret' }));
    await validateBoth(result);
    await expect(act(() => result.current.submit())).resolves.toBeUndefined();

    rerender({ status: statusFixture({ observedAt: '2026-08-09T00:00:01Z' }) });
    act(() => result.current.updateManagement({ password: 'retry-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());

    expect(api.configureSetup).toHaveBeenCalledOnce();
    expect(result.current.canSubmit).toBe(false);
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

async function validateBoth(result: { current: ReturnType<typeof useSetupConfigurationController> }) {
  await act(() => result.current.validateSection('metadata_database'));
  await act(() => result.current.validateSection('telemetry_store'));
}

function validResult() {
  return { valid: true, observedAt: '2026-08-08T06:00:00Z', errorCode: null, warnings: [] };
}

function refreshSucceeded(status: SetupStatus) {
  return { succeeded: true as const, status };
}

function refreshFailed() {
  return { succeeded: false as const, status: null };
}
