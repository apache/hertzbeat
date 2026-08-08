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
    const onConverge = vi.fn();
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

  it('retains secrets when configuration fails so the operator can retry', async () => {
    api.configureSetup.mockRejectedValue(new api.SetupRequestError('http', 409, 'config_write_failed'));
    const { result } = renderHook(() => useSetupConfigurationController(statusFixture(), vi.fn()));
    act(() => result.current.updateManagement({ password: 'retry-secret' }));
    await validateBoth(result);
    await act(() => result.current.submit());
    expect(result.current.draft.managementDatabase.password).toBe('retry-secret');
    expect(result.current.submitFailure).toMatchObject({ failure: 'error', errorCode: 'config_write_failed' });
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
      publicAccessConfigured: false,
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
