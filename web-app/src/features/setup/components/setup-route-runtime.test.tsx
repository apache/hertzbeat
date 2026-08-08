/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { initializeI18n } from '@/core/i18n/i18n';
import { AppProviders } from '@/app/providers';

const api = vi.hoisted(() => ({ loadSetupStatus: vi.fn(), createSetupAdministrator: vi.fn() }));
vi.mock('../api/setup-api', async importOriginal => ({ ...(await importOriginal()), ...api }));

import { SetupRequestError } from '../api/setup-api';
import type { SetupRouteController } from '../controller/use-setup-route-controller';
import { SetupRouteRuntime } from '../controller/setup-route-runtime';
import type { SetupAccess, SetupPhase, SetupStatus } from '../model/setup-contract';
import { SetupPage } from '../pages/setup-page';
import { SetupRouteBoundary } from './setup-route-boundary';

const paths = { setup: '/setup', login: '/passport/login' };
const productMount = vi.fn();

describe('SetupRouteBoundary', () => {
  beforeAll(() => initializeI18n());
  afterEach(() => {
    cleanup();
    productMount.mockClear();
    api.loadSetupStatus.mockReset();
    api.createSetupAdministrator.mockReset();
  });

  it('redirects incomplete product entry to setup without mounting the product runtime', () => {
    renderBoundary('/dashboard', ready('configuration_required', 'local'));
    expect(screen.getByTestId('location')).toHaveTextContent('/setup');
    expect(screen.queryByTestId('product')).not.toBeInTheDocument();
    expect(productMount).not.toHaveBeenCalled();
  });

  it('keeps locked setup outside the product runtime', () => {
    renderBoundary('/setup', ready('configuration_required', 'locked'));
    expect(screen.getByTestId('setup')).toBeInTheDocument();
    expect(productMount).not.toHaveBeenCalled();
  });

  it('allows product entry only after completion and sends setup to login', () => {
    const { unmount } = renderBoundary('/dashboard', ready('complete', 'local'));
    expect(screen.getByTestId('product')).toBeInTheDocument();
    unmount();
    renderBoundary('/setup', ready('complete', 'local'));
    expect(screen.getByTestId('location')).toHaveTextContent('/passport/login');
  });

  it('renders an explicit unavailable boundary instead of redirecting', () => {
    renderBoundary('/dashboard', controllerState('unavailable'));
    expect(screen.getByRole('heading', { name: 'Setup status unavailable' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });

  it('keeps an initial status request failure unavailable in the real runtime', async () => {
    api.loadSetupStatus.mockRejectedValueOnce(new SetupRequestError('unavailable'));

    renderRuntime();

    expect(await screen.findByRole('heading', { name: 'Setup status unavailable' })).toBeInTheDocument();
  });

  it('keeps trusted convergence context through a temporary refresh failure and reaches the next phase', async () => {
    api.loadSetupStatus
      .mockResolvedValueOnce(setupStatus('application_starting', 'local'))
      .mockRejectedValueOnce(new SetupRequestError('unavailable'))
      .mockResolvedValueOnce(setupStatus('administrator_required', 'local'));

    renderRuntime();

    expect(await screen.findByText(/starting with the new configuration/i)).toBeInTheDocument();
    expect(await screen.findByText(/last verified setup status remains visible/i)).toBeInTheDocument();
    await waitFor(() => expect(api.loadSetupStatus).toHaveBeenCalledTimes(3), { timeout: 2_000 });
    expect(await screen.findByRole('heading', { name: 'Create the first administrator' })).toBeInTheDocument();
  });

  it('creates the administrator and advances the real runtime to optional configuration', async () => {
    api.loadSetupStatus
      .mockResolvedValueOnce(setupStatus('administrator_required', 'local'))
      .mockResolvedValueOnce(setupStatus('optional_configuration', 'local'));
    api.createSetupAdministrator.mockResolvedValue({ username: 'operator', phase: 'optional_configuration' });
    renderRuntime();

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'request-secret' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'request-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));

    await waitFor(() =>
      expect(api.createSetupAdministrator).toHaveBeenCalledWith(
        { username: 'operator', password: 'request-secret' },
        expect.any(AbortSignal)
      )
    );
    expect(await screen.findByRole('heading', { name: 'Optional configuration' })).toBeInTheDocument();
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);
  });
});

function renderRuntime() {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={['/setup']}>
        <Routes>
          <Route element={<SetupRouteRuntime paths={paths} product={<div>Product</div>} />}>
            <Route path="/setup" element={<SetupPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppProviders>
  );
}

function renderBoundary(path: string, controller: ReturnType<typeof controllerState>) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SetupRouteBoundary
        controller={controller}
        paths={paths}
        loading={<span>Loading setup status</span>}
        unavailable={<h1>Setup status unavailable</h1>}
        product={<ProductProbe />}
        setup={<div data-testid="setup">Setup</div>}
      />
      <LocationProbe />
    </MemoryRouter>
  );
}

function ProductProbe() {
  productMount();
  return useLocation().pathname === '/dashboard' ? <div data-testid="product">Product</div> : null;
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function ready(phase: SetupPhase, access: SetupAccess): SetupRouteController {
  return controllerState('ready', { phase, access });
}

function controllerState(
  state: 'loading' | 'unavailable' | 'ready',
  status: Pick<SetupStatus, 'phase' | 'access'> | null = null
): SetupRouteController {
  const shared = {
    retry: vi.fn(),
    unlockCode: '',
    setUnlockCode: vi.fn(),
    unlock: vi.fn(() => Promise.resolve()),
    unlockPending: false,
    unlockErrorCode: null,
    unlockFailureKind: null,
    statusRefreshFailed: false
  };
  if (state === 'ready' && status) {
    return { state: 'ready', status: setupStatus(status.phase, status.access), ...shared };
  }
  if (state === 'loading') return { state: 'loading', status: null, ...shared };
  return { state: 'unavailable', status: null, ...shared };
}

function setupStatus(phase: SetupPhase, access: SetupAccess): SetupStatus {
  return {
    phase,
    observedAt: '2026-08-08T06:00:00Z',
    access,
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
    pendingWarnings: []
  };
}
