/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeI18n } from '@/core/i18n/i18n';
import { AppProviders } from '@/app/providers';

const route = vi.hoisted(() => ({ useSetupRouteContext: vi.fn() }));
vi.mock('../controller/setup-route-context', () => route);
const configuration = vi.hoisted(() => ({ useSetupConfigurationController: vi.fn() }));
vi.mock('../controller/use-setup-configuration-controller', () => configuration);
const optional = vi.hoisted(() => ({ useSetupOptionalController: vi.fn() }));
vi.mock('../controller/use-setup-optional-controller', () => optional);

import { SetupPage } from './setup-page';

describe('SetupPage access gate', () => {
  beforeAll(() => initializeI18n());
  beforeEach(() => {
    vi.clearAllMocks();
    optional.useSetupOptionalController.mockReturnValue(optionalController());
  });
  afterEach(cleanup);

  it('shows only the one-time-code unlock view while remote setup is locked', () => {
    route.useSetupRouteContext.mockReturnValue({
      state: 'ready',
      status: { phase: 'configuration_required', access: 'locked' },
      unlockCode: '',
      setUnlockCode: vi.fn(),
      unlock: vi.fn(),
      unlockPending: false,
      unlockErrorCode: null,
      unlockFailureKind: null,
      retry: vi.fn()
    });

    render(
      <AppProviders>
        <SetupPage />
      </AppProviders>
    );

    expect(screen.getByRole('heading', { name: 'Unlock remote setup' })).toBeInTheDocument();
    expect(screen.getByLabelText('One-time code')).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.queryByText('Management database')).not.toBeInTheDocument();
  });

  it('renders a safe visible message for network unlock failure', () => {
    route.useSetupRouteContext.mockReturnValue({
      state: 'ready',
      status: { phase: 'configuration_required', access: 'locked' },
      unlockCode: '',
      setUnlockCode: vi.fn(),
      unlock: vi.fn(),
      unlockPending: false,
      unlockErrorCode: null,
      unlockFailureKind: 'unavailable',
      retry: vi.fn()
    });

    render(
      <AppProviders>
        <SetupPage />
      </AppProviders>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Setup service is unavailable. Try again.');
  });

  it('routes administrator_required to the first-administrator form', () => {
    route.useSetupRouteContext.mockReturnValue({
      state: 'ready',
      status: statusFixture('administrator_required'),
      retry: vi.fn()
    });

    render(
      <AppProviders>
        <SetupPage />
      </AppProviders>
    );

    expect(screen.getByRole('heading', { name: 'Create the first administrator' })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(configuration.useSetupConfigurationController).not.toHaveBeenCalled();
  });

  it('routes optional_configuration away from the database and administrator forms', () => {
    route.useSetupRouteContext.mockReturnValue({
      state: 'ready',
      status: statusFixture('optional_configuration'),
      retry: vi.fn()
    });

    render(
      <AppProviders>
        <SetupPage />
      </AppProviders>
    );

    expect(screen.getByRole('heading', { name: 'Optional configuration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Public access' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Connect data services' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create the first administrator' })).not.toBeInTheDocument();
    expect(configuration.useSetupConfigurationController).not.toHaveBeenCalled();
  });
});

function statusFixture(phase: 'administrator_required' | 'optional_configuration') {
  return {
    phase,
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
    pendingWarnings: []
  };
}

function optionalController() {
  return {
    draft: {
      publicBaseUrl: '',
      serverOtlpHttpEndpoint: '',
      serverOtlpGrpcEndpoint: '',
      retentionDays: null,
      mail: { host: '', port: null, security: 'starttls', username: '', password: '', fromAddress: '' }
    },
    updateDraft: vi.fn(),
    save: vi.fn(),
    savePending: false,
    saveFailureKey: null,
    validatePublicAccess: vi.fn(),
    validateMail: vi.fn(),
    validation: { publicAccess: null, mail: null },
    pendingWarnings: [],
    acknowledgedWarnings: [],
    setWarningAcknowledged: vi.fn(),
    complete: vi.fn(),
    completePending: false,
    completeFailureKey: null
  };
}
