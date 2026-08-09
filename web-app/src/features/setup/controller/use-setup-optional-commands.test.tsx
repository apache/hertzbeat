/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ completeSetup: vi.fn(), saveSetupOptions: vi.fn() }));
vi.mock('../api/setup-api', async importOriginal => ({ ...(await importOriginal()), ...api }));

import { SetupRequestError } from '../api/setup-api';
import { createOptionalDraft } from '../model/setup-optional';
import { successfulSetupStatusRefresh } from './setup-status-refresh';
import { useSetupOptionalCommands } from './use-setup-optional-commands';

describe('useSetupOptionalCommands refresh abort boundary', () => {
  afterEach(() => vi.clearAllMocks());

  it.each(['save success', 'save rejection', 'complete rejection'] as const)(
    'does not publish command state when %s refresh returns after abort',
    async path => {
      const refreshResult = deferred<ReturnType<typeof successfulSetupStatusRefresh>>();
      const refresh = vi.fn(() => refreshResult.promise);
      const request = new AbortController();
      const release = vi.fn();
      if (path === 'save success') api.saveSetupOptions.mockResolvedValue(optionsResponse());
      if (path === 'save rejection') {
        api.saveSetupOptions.mockRejectedValue(new SetupRequestError('http', 400, 'invalid_request'));
      }
      if (path === 'complete rejection') {
        api.completeSetup.mockRejectedValue(new SetupRequestError('http', 400, 'invalid_request'));
      }
      const view = renderHook(() =>
        useSetupOptionalCommands({
          status: statusFixture(),
          draftRef: { current: createOptionalDraft() },
          refresh,
          startWrite: () => ({ signal: request.signal, release }),
          clearMailSecret: vi.fn(),
          resetMailValidation: vi.fn(),
          onCompleted: vi.fn()
        })
      );
      let command!: Promise<void>;
      act(() => {
        command = path.startsWith('save') ? view.result.current.save() : view.result.current.complete();
      });
      await waitFor(() => expect(refresh).toHaveBeenCalledOnce());

      request.abort();
      refreshResult.resolve(successfulSetupStatusRefresh(statusFixture()));
      await act(() => command);

      expect(view.result.current.saveFailureKey).toBeNull();
      expect(view.result.current.completeFailureKey).toBeNull();
      expect(path.startsWith('save') ? view.result.current.savePending : view.result.current.completePending).toBe(
        true
      );
      expect(release).toHaveBeenCalledOnce();
      view.unmount();
    }
  );
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function optionsResponse() {
  return {
    publicBaseUrlConfigured: false,
    serverOtlpHttpConfigured: false,
    serverOtlpGrpcConfigured: false,
    retentionConfigured: false,
    mailConfigured: false,
    phase: 'optional_configuration' as const
  };
}

function statusFixture() {
  return {
    phase: 'optional_configuration' as const,
    observedAt: '2026-08-09T07:00:00Z',
    access: 'local' as const,
    applyMode: 'managed_write' as const,
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: {
      kind: 'h2' as const,
      configured: true,
      source: 'ui_managed' as const,
      restartRequired: false
    },
    telemetryStore: {
      kind: 'greptime' as const,
      configured: true,
      source: 'ui_managed' as const,
      restartRequired: false
    },
    administratorConfigured: true,
    optional: {
      publicBaseUrlConfigured: false,
      serverOtlpHttpConfigured: false,
      serverOtlpGrpcConfigured: false,
      retentionConfigured: false,
      mailConfigured: false
    },
    pendingWarnings: []
  };
}
