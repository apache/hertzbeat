/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { initializeI18n } from '@/core/i18n/i18n';
import { AppProviders } from '@/app/providers';

const api = vi.hoisted(() => ({
  loadSetupStatus: vi.fn(),
  createSetupAdministrator: vi.fn(),
  unlockSetup: vi.fn(),
  validateSetupSection: vi.fn(),
  configureSetup: vi.fn(),
  exportSetupConfiguration: vi.fn(),
  loadSetupOperation: vi.fn()
}));
const download = vi.hoisted(() => ({ downloadSetupArtifact: vi.fn() }));
vi.mock('../api/setup-api', async importOriginal => ({ ...(await importOriginal()), ...api }));
vi.mock('../controller/setup-download', () => download);

import { SetupRequestError } from '../api/setup-api';
import type { SetupRouteController } from '../controller/use-setup-route-controller';
import { SetupRouteRuntime } from '../route/setup-route-runtime';
import type { SetupAccess, SetupPhase, SetupStatus } from '../model/setup-contract';
import { SetupPage } from '../pages/setup-page';
import { SetupRouteBoundary } from '../components/setup-route-boundary';

const paths = { setup: '/setup', login: '/passport/login' };
const productMount = vi.fn();

describe('SetupRouteBoundary', () => {
  beforeAll(() => initializeI18n());
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    productMount.mockClear();
    api.loadSetupStatus.mockReset();
    api.createSetupAdministrator.mockReset();
    api.unlockSetup.mockReset();
    api.validateSetupSection.mockReset();
    api.configureSetup.mockReset();
    api.exportSetupConfiguration.mockReset();
    api.loadSetupOperation.mockReset();
    download.downloadSetupArtifact.mockReset();
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

  it('backs off a resolved TanStack status refetch error in the real QueryClient adapter', async () => {
    vi.useFakeTimers();
    api.loadSetupStatus
      .mockResolvedValueOnce(setupStatus('application_starting', 'local'))
      .mockRejectedValue(new SetupRequestError('unavailable'));
    renderRuntime();
    await flushImmediateQueryUpdates();
    expect(api.loadSetupStatus).toHaveBeenCalledOnce();

    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(3);
  });

  it('backs off active operation polling after a real QueryClient refetch failure', async () => {
    vi.useFakeTimers();
    api.loadSetupStatus.mockResolvedValue(
      setupStatus('configuration_required', 'local', { operationId: 'running-operation' })
    );
    api.loadSetupOperation
      .mockResolvedValueOnce({
        operationId: 'running-operation',
        state: 'running',
        phase: 'application_starting',
        createdAt: '2026-08-09T00:00:00Z',
        startedAt: '2026-08-09T00:00:00Z',
        completedAt: null,
        errorCode: null,
        nextPollAfterMillis: 250,
        exportAvailable: false
      })
      .mockRejectedValue(new SetupRequestError('unavailable'));
    renderRuntime();
    await flushImmediateQueryUpdates();
    expect(api.loadSetupOperation).toHaveBeenCalledOnce();

    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(api.loadSetupOperation).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(api.loadSetupOperation).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(api.loadSetupOperation).toHaveBeenCalledTimes(3);
    for (const [delay, expectedCalls] of [
      [1_000, 4],
      [2_000, 5],
      [4_000, 6],
      [5_000, 7],
      [5_000, 8]
    ] as const) {
      await act(() => vi.advanceTimersByTimeAsync(delay - 1));
      expect(api.loadSetupOperation).toHaveBeenCalledTimes(expectedCalls - 1);
      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(api.loadSetupOperation).toHaveBeenCalledTimes(expectedCalls);
    }
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

  it('converges administrator creation after serialized status refresh failures without replaying the POST', async () => {
    api.loadSetupStatus
      .mockResolvedValueOnce(setupStatus('administrator_required', 'local'))
      .mockRejectedValueOnce(new SetupRequestError('unavailable'))
      .mockRejectedValueOnce(new SetupRequestError('unavailable'))
      .mockResolvedValueOnce(setupStatus('optional_configuration', 'local', { administratorConfigured: true }));
    api.createSetupAdministrator.mockResolvedValue({ username: 'operator', phase: 'optional_configuration' });
    const view = renderRuntime();
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'request-secret' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'request-secret' } });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));
    await flushImmediateQueryUpdates();

    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(3);
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(3);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(4);
    await flushImmediateQueryUpdates();
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(screen.getByRole('heading', { name: 'Optional configuration' })).toBeInTheDocument();
    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
    view.unmount();
  });

  it('aborts administrator status convergence and clears its retry timer on unmount', async () => {
    let refreshSignal: AbortSignal | undefined;
    api.loadSetupStatus.mockResolvedValueOnce(setupStatus('administrator_required', 'local')).mockImplementationOnce(
      signal =>
        new Promise((_resolve, reject) => {
          refreshSignal = signal;
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        })
    );
    api.createSetupAdministrator.mockResolvedValue({ username: 'operator', phase: 'optional_configuration' });
    const view = renderRuntime();
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'request-secret' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'request-secret' } });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));
    await flushImmediateQueryUpdates();
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(refreshSignal?.aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);
  });

  it('rereads authoritative status and retires administrator secrets after an uncertain write', async () => {
    api.loadSetupStatus
      .mockResolvedValueOnce(setupStatus('administrator_required', 'local'))
      .mockResolvedValueOnce(setupStatus('administrator_required', 'local', { observedAt: '2026-08-08T06:00:01Z' }));
    api.createSetupAdministrator.mockRejectedValue(new SetupRequestError('unavailable'));
    renderRuntime();

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'uncertain-secret' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'uncertain-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));

    await waitFor(() => expect(api.loadSetupStatus).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Confirm password')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));
    expect(api.createSetupAdministrator).toHaveBeenCalledOnce();
  });

  it('aborts unlock when the real setup runtime unmounts', async () => {
    let unlockSignal: AbortSignal | undefined;
    api.loadSetupStatus.mockResolvedValue(setupStatus('configuration_required', 'locked'));
    api.unlockSetup.mockImplementation((_code, signal) => {
      unlockSignal = signal;
      return new Promise(() => undefined);
    });
    const view = renderRuntime();

    fireEvent.change(await screen.findByLabelText('One-time code'), { target: { value: 'private-code' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock setup' }));
    await waitFor(() => expect(api.unlockSetup).toHaveBeenCalledOnce());
    view.unmount();

    expect(unlockSignal?.aborted).toBe(true);
  });

  it('preserves external-apply secrets and export across authoritative phase convergence', async () => {
    api.loadSetupStatus
      .mockResolvedValueOnce(setupStatus('configuration_required', 'local', { applyMode: 'external_apply' }))
      .mockResolvedValue(
        setupStatus('external_apply_required', 'local', {
          applyMode: 'external_apply',
          operationId: 'external-operation'
        })
      );
    api.validateSetupSection.mockResolvedValue({
      valid: true,
      observedAt: '2026-08-09T00:00:00Z',
      errorCode: null,
      warnings: []
    });
    api.configureSetup.mockResolvedValue({
      operationId: 'external-operation',
      state: 'awaiting_external_apply',
      phase: 'external_apply_required',
      nextPollAfterMillis: 20,
      exportAvailable: true
    });
    api.loadSetupOperation.mockResolvedValue({
      operationId: 'external-operation',
      state: 'awaiting_external_apply',
      phase: 'external_apply_required',
      createdAt: '2026-08-09T00:00:00Z',
      startedAt: '2026-08-09T00:00:01Z',
      completedAt: null,
      errorCode: null,
      nextPollAfterMillis: 20,
      exportAvailable: true
    });
    api.exportSetupConfiguration.mockResolvedValue({
      blob: new Blob(['opaque']),
      fileName: 'setup.yml',
      mediaType: 'application/yaml'
    });
    renderRuntime();

    const passwords = await screen.findAllByLabelText('Password');
    fireEvent.change(passwords[0]!, { target: { value: 'metadata-secret' } });
    fireEvent.change(screen.getByLabelText('gRPC endpoints'), { target: { value: 'greptime:4001' } });
    fireEvent.change(screen.getByLabelText('HTTP endpoint'), { target: { value: 'http://greptime:4000' } });
    const validateButtons = screen.getAllByRole('button', { name: 'Validate connection' });
    fireEvent.click(validateButtons[0]!);
    fireEvent.click(validateButtons[1]!);
    await waitFor(() => expect(api.validateSetupSection).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Apply configuration' }));

    await waitFor(() => expect(api.loadSetupStatus).toHaveBeenCalledTimes(2), { timeout: 2_000 });
    const yamlExport = await screen.findByRole('button', { name: 'Download YAML' });
    await new Promise(resolve => setTimeout(resolve, 300));
    fireEvent.click(yamlExport);

    await waitFor(() => expect(api.exportSetupConfiguration).toHaveBeenCalledOnce());
    expect(api.exportSetupConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        configuration: expect.objectContaining({
          managementDatabase: expect.objectContaining({ password: 'metadata-secret' })
        })
      }),
      expect.any(AbortSignal)
    );
    expect(download.downloadSetupArtifact).toHaveBeenCalledOnce();
  });

  it('keeps real QueryClient terminal convergence alive while status still names the stale operation', async () => {
    let resolveStaleStatus: ((status: SetupStatus) => void) | undefined;
    api.loadSetupStatus
      .mockResolvedValueOnce(setupStatus('configuration_required', 'local', { operationId: 'terminal-operation' }))
      .mockImplementationOnce(() => new Promise<SetupStatus>(resolve => (resolveStaleStatus = resolve)))
      .mockResolvedValueOnce(setupStatus('configuration_required', 'local', { observedAt: '2026-08-09T00:00:02Z' }));
    api.loadSetupOperation.mockResolvedValue({
      operationId: 'terminal-operation',
      state: 'failed',
      phase: 'configuration_required',
      createdAt: '2026-08-09T00:00:00Z',
      startedAt: '2026-08-09T00:00:00Z',
      completedAt: '2026-08-09T00:00:01Z',
      errorCode: 'config_write_failed',
      nextPollAfterMillis: 0,
      exportAvailable: false
    });

    renderRuntime();
    await waitFor(() => expect(api.loadSetupOperation).toHaveBeenCalledOnce());
    await waitFor(() => expect(api.loadSetupStatus).toHaveBeenCalledTimes(2));
    vi.useFakeTimers();
    await act(async () => {
      resolveStaleStatus?.(
        setupStatus('configuration_required', 'local', {
          operationId: 'terminal-operation',
          observedAt: '2026-08-09T00:00:01Z'
        })
      );
      await Promise.resolve();
    });
    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(api.loadSetupStatus).toHaveBeenCalledTimes(3);
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

async function flushImmediateQueryUpdates() {
  await act(async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
    }
  });
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

function setupStatus(phase: SetupPhase, access: SetupAccess, overrides: Partial<SetupStatus> = {}): SetupStatus {
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
