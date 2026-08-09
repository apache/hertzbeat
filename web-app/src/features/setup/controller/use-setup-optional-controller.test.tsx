/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  completeSetup: vi.fn(),
  saveSetupOptions: vi.fn(),
  validateSetupSection: vi.fn()
}));
vi.mock('../api/setup-api', async importOriginal => ({ ...(await importOriginal()), ...api }));

import { SetupRequestError } from '../api/setup-api';
import { successfulSetupStatusRefresh } from './setup-status-refresh';
import { useSetupOptionalController } from './use-setup-optional-controller';

describe('useSetupOptionalController', () => {
  afterEach(() => vi.clearAllMocks());

  it('submits options once, clears the mail secret, and refreshes authoritative warnings', async () => {
    api.saveSetupOptions.mockResolvedValue(optionsResponse());
    api.validateSetupSection.mockResolvedValue(validationResponse());
    const refresh = vi.fn().mockResolvedValue(successfulSetupStatusRefresh(statusFixture()));
    const { result } = renderHook(() => useSetupOptionalController(statusFixture(), refresh, vi.fn()));

    act(() => result.current.updateDraft({ mail: completeMail('request-secret') }));
    await act(() => result.current.validateMail());
    expect(result.current.validation.mail).toMatchObject({ state: 'complete', valid: true });
    await act(() => result.current.save());

    expect(api.saveSetupOptions).toHaveBeenCalledWith(
      { mail: { ...completeMail('request-secret'), port: 587 } },
      expect.any(AbortSignal)
    );
    expect(api.saveSetupOptions).toHaveBeenCalledOnce();
    expect(result.current.draft.mail.password).toBe('');
    expect(result.current.validation.mail).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('clears mail secret and closes retry after an uncertain options outcome', async () => {
    api.saveSetupOptions.mockRejectedValue(new SetupRequestError('unavailable'));
    api.validateSetupSection.mockResolvedValue(validationResponse());
    const refresh = vi.fn().mockResolvedValue(successfulSetupStatusRefresh(statusFixture()));
    const { result } = renderHook(() => useSetupOptionalController(statusFixture(), refresh, vi.fn()));
    act(() => result.current.updateDraft({ mail: completeMail('uncertain-secret') }));
    await act(() => result.current.validateMail());
    expect(result.current.validation.mail).toMatchObject({ state: 'complete', valid: true });

    await act(() => result.current.save());
    await act(() => result.current.save());

    expect(result.current.draft.mail.password).toBe('');
    expect(result.current.validation.mail).toBeNull();
    expect(result.current.saveFailureKey).toBe('setup.optional.saveUncertain');
    expect(api.saveSetupOptions).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('allows a manual retry only after definite rejection and authoritative optional status', async () => {
    api.saveSetupOptions
      .mockRejectedValueOnce(new SetupRequestError('http', 400, 'invalid_request'))
      .mockResolvedValueOnce(optionsResponse());
    const refresh = vi.fn().mockResolvedValue(successfulSetupStatusRefresh(statusFixture()));
    const { result } = renderHook(() => useSetupOptionalController(statusFixture(), refresh, vi.fn()));

    await act(() => result.current.save());
    expect(result.current.saveFailureKey).toBe('setup.optional.saveRejected');
    await act(() => result.current.save());

    expect(api.saveSetupOptions).toHaveBeenCalledTimes(2);
  });

  it('requires all authoritative warnings and completes once with the backend result', async () => {
    const completed = vi.fn();
    api.completeSetup.mockResolvedValue({
      phase: 'complete',
      completedAt: '2026-08-09T08:00:00Z',
      loginPath: '/passport/login',
      username: 'operator'
    });
    const status = statusFixture({ pendingWarnings: ['public_address_plaintext', 'h2_non_production'] });
    const { result } = renderHook(() => useSetupOptionalController(status, vi.fn(), completed));

    await act(() => result.current.complete());
    expect(api.completeSetup).not.toHaveBeenCalled();
    act(() => {
      result.current.setWarningAcknowledged('public_address_plaintext', true);
      result.current.setWarningAcknowledged('h2_non_production', true);
    });
    await act(() => result.current.complete());

    expect(api.completeSetup).toHaveBeenCalledWith(
      {
        expectedPhase: 'optional_configuration',
        acknowledgedWarnings: ['public_address_plaintext', 'h2_non_production']
      },
      expect.any(AbortSignal)
    );
    expect(api.completeSetup).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenCalledWith(
      expect.objectContaining({ loginPath: '/passport/login', username: 'operator' })
    );
  });

  it('retires mail validation with the secret after an uncertain completion outcome', async () => {
    api.validateSetupSection.mockResolvedValue(validationResponse());
    api.completeSetup.mockRejectedValue(new SetupRequestError('unavailable'));
    const refresh = vi.fn().mockResolvedValue(successfulSetupStatusRefresh(statusFixture()));
    const { result } = renderHook(() => useSetupOptionalController(statusFixture(), refresh, vi.fn()));
    act(() => result.current.updateDraft({ mail: completeMail('completion-secret') }));
    await act(() => result.current.validateMail());
    expect(result.current.validation.mail).toMatchObject({ state: 'complete', valid: true });

    await act(() => result.current.complete());

    expect(result.current.draft.mail.password).toBe('');
    expect(result.current.validation.mail).toBeNull();
    expect(result.current.completeFailureKey).toBe('setup.optional.complete.uncertain');
  });

  it('does not refresh or publish save failure after the optional phase unmounts', async () => {
    api.saveSetupOptions.mockImplementation((_value: unknown, signal: AbortSignal) => rejectWhenAborted(signal));
    const refresh = vi.fn();
    const view = renderHook(() => useSetupOptionalController(statusFixture(), refresh, vi.fn()));
    let command!: Promise<void>;
    act(() => {
      command = view.result.current.save();
    });
    await waitFor(() => expect(api.saveSetupOptions).toHaveBeenCalledOnce());

    view.unmount();
    await command;

    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not refresh or publish completion failure after the optional phase unmounts', async () => {
    api.completeSetup.mockImplementation((_value: unknown, signal: AbortSignal) => rejectWhenAborted(signal));
    const refresh = vi.fn();
    const view = renderHook(() => useSetupOptionalController(statusFixture(), refresh, vi.fn()));
    let command!: Promise<void>;
    act(() => {
      command = view.result.current.complete();
    });
    await waitFor(() => expect(api.completeSetup).toHaveBeenCalledOnce());

    view.unmount();
    await command;

    expect(refresh).not.toHaveBeenCalled();
  });

  it('clears a mail secret when mail validation has an uncertain failure', async () => {
    api.validateSetupSection.mockRejectedValue(new SetupRequestError('unavailable'));
    const { result } = renderHook(() => useSetupOptionalController(statusFixture(), vi.fn(), vi.fn()));
    act(() => result.current.updateDraft({ mail: completeMail('validation-secret') }));

    await act(() => result.current.validateMail());

    await waitFor(() => expect(result.current.draft.mail.password).toBe(''));
    expect(result.current.validation.mail).toMatchObject({ state: 'failed', failure: 'unavailable' });
  });
});

function completeMail(password: string) {
  return {
    host: 'smtp.example.test',
    port: 587,
    security: 'starttls' as const,
    username: 'operator',
    password,
    fromAddress: 'alerts@example.test'
  };
}

function optionsResponse() {
  return {
    publicBaseUrlConfigured: false,
    serverOtlpHttpConfigured: false,
    serverOtlpGrpcConfigured: false,
    retentionConfigured: false,
    mailConfigured: true,
    phase: 'optional_configuration' as const
  };
}

function validationResponse() {
  return { valid: true, observedAt: '2026-08-09T07:00:00Z', errorCode: null, warnings: [] };
}

function rejectWhenAborted(signal: AbortSignal) {
  return new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
}

function statusFixture(overrides: Record<string, unknown> = {}) {
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
    pendingWarnings: [],
    ...overrides
  };
}
