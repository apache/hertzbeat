/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { CollectorInstrumentationIntake } from '@/shared/collector';

const resource = vi.hoisted(() => ({
  useCollectorController: vi.fn()
}));

vi.mock('../controller/use-collector-controller', () => ({
  useCollectorController: resource.useCollectorController
}));

import { CollectorPage } from './collector-page';

describe('CollectorPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => resource.useCollectorController.mockReturnValue(buildController()));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the canonical workflow and delegates search, refresh, paging, and row actions', () => {
    const controller = buildController();
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Collector management' })).toBeInTheDocument();
    expect(screen.getAllByText('10.0.0.7')).toHaveLength(2);
    fireEvent.change(screen.getByPlaceholderText('Search collectors'), { target: { value: ' west ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configure edge intake' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configure edge managed runtime' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take edge offline' }));
    fireEvent.click(screen.getByTitle('Next Page'));

    expect(controller.actions.setNameDraft).toHaveBeenCalledWith(' west ');
    expect(controller.actions.submitName).toHaveBeenCalledTimes(1);
    expect(controller.actions.refresh).toHaveBeenCalledTimes(1);
    expect(controller.actions.openIntake).toHaveBeenCalledWith('edge');
    expect(controller.actions.openRuntimeConfig).toHaveBeenCalledWith('edge');
    expect(controller.actions.requestAction).toHaveBeenCalledWith('offline', ['edge']);
    expect(controller.actions.setPage).toHaveBeenCalledWith(1, 8);
    expect(
      screen.queryByRole('button', { name: /main-default-collector (online|offline|delete)/i })
    ).not.toBeInTheDocument();
  });

  it('edits or clears only the explicit safe intake advertisement and exposes no Token field', async () => {
    const controller = buildController({ intakeEditor: { record: collector('edge', false, intakeAvailable()) } });
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    const dialog = screen.getByRole('dialog', { name: 'Instrumentation intake for edge' });
    expect(within(dialog).getByLabelText('Gateway')).toBeInTheDocument();
    expect(within(dialog).getByText('Server')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'OTLP gRPC' })).toBeChecked();
    expect(within(dialog).getByLabelText('OTLP gRPC HTTPS endpoint')).toHaveValue(
      'https://telemetry.example.test:4317'
    );
    expect(within(dialog).queryByLabelText(/token/i)).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save advertisement' }));
    await waitFor(() =>
      expect(controller.actions.saveIntake).toHaveBeenCalledWith({
        schemaVersion: 1,
        gateway: 'server',
        capabilities: ['otlp_grpc'],
        otlpHttpEndpoint: null,
        otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
      })
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear advertisement' }));
    const clearDialog = screen.getByText('Clear intake advertisement for edge?').closest('[role="dialog"]');
    expect(clearDialog).not.toBeNull();
    fireEvent.click(within(clearDialog as HTMLElement).getByRole('button', { name: 'Cancel' }));
    expect(controller.actions.clearIntake).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear advertisement' }));
    const reopenedClearDialog = screen
      .getAllByText('Clear intake advertisement for edge?')
      .at(-1)
      ?.closest('[role="dialog"]');
    expect(reopenedClearDialog).not.toBeNull();
    fireEvent.click(within(reopenedClearDialog as HTMLElement).getByRole('button', { name: 'Clear advertisement' }));
    expect(controller.actions.clearIntake).toHaveBeenCalledTimes(1);
  });

  it('keeps invalid Save feedback visible inside the intake dialog without transport', async () => {
    const controller = buildController({ intakeEditor: { record: collector('edge', false, intakeAvailable()) } });
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();
    const dialog = screen.getByRole('dialog', { name: 'Instrumentation intake for edge' });

    fireEvent.change(within(dialog).getByLabelText('OTLP gRPC HTTPS endpoint'), {
      target: { value: 'http://unsafe.example.test:4317' }
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save advertisement' }));

    await waitFor(() =>
      expect(
        within(dialog).getByText('Use HTTPS endpoints that exactly match the selected capabilities.')
      ).toBeInTheDocument()
    );
    expect(controller.actions.saveIntake).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('OTLP gRPC HTTPS endpoint'), {
      target: { value: 'https://telemetry.example.test:4317' }
    });
    expect(
      within(dialog).queryByText('Use HTTPS endpoints that exactly match the selected capabilities.')
    ).not.toBeInTheDocument();
  });

  it('distinguishes every safe current intake state and allows persisted invalid state recovery', () => {
    const records = [
      collector('available', false, { ...intakeAvailable(), collectorId: 'available' }),
      collector('absent'),
      collector('invalid', false, intakeUnavailable('intake_advertisement_invalid')),
      collector('unavailable', false, intakeUnavailable('intake_advertisement_unavailable'))
    ];
    resource.useCollectorController.mockReturnValue(
      buildController({
        listState: { kind: 'ready', records, total: records.length },
        intakeEditor: { record: records[2] }
      })
    );
    renderPage();

    expect(screen.getByText('Advertised')).toBeInTheDocument();
    expect(screen.getByText('Not advertised')).toBeInTheDocument();
    expect(screen.getAllByText('Stored advertisement is invalid.').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Advertisement is currently unavailable.')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Instrumentation intake for invalid' });
    expect(within(dialog).getByRole('button', { name: 'Clear advertisement' })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('OTLP gRPC HTTPS endpoint')).not.toBeInTheDocument();
  });

  it('edits only managed runtime core fields and keeps source policy as a redacted summary', async () => {
    const controller = buildController({
      runtimeEditor: { record: collector('edge'), config: runtimeConfig() }
    });
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    const dialog = screen.getByRole('dialog', { name: 'Managed runtime for edge' });
    expect(within(dialog).getByText('1 Prometheus target')).toBeInTheDocument();
    expect(within(dialog).getByText('1 FileLog source')).toBeInTheDocument();
    expect(within(dialog).getByText('Source details are managed by dedicated editors.')).toBeInTheDocument();
    expect(within(dialog).getByText('Schema 3 · revision 7')).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('payments-key-ref');
    expect(dialog).not.toHaveTextContent('internal-ca');
    expect(within(dialog).queryByLabelText(/token|secret|raw json/i)).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Environment'), { target: { value: 'staging' } });
    fireEvent.change(within(dialog).getByLabelText('Host metrics interval (seconds)'), { target: { value: '45' } });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Disk' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Docker' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Health-check traces' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save runtime config' }));

    await waitFor(() =>
      expect(controller.actions.saveRuntimeConfig).toHaveBeenCalledWith({
        environment: 'staging',
        hostMetricsEnabled: true,
        hostMetricsIntervalSeconds: 45,
        hostMetricsScrapers: ['CPU', 'MEMORY', 'DISK'],
        resourceDetectors: ['ENV', 'SYSTEM', 'DOCKER'],
        telemetryFilterPresets: ['HEALTH_CHECK_TRACES']
      })
    );
  });

  it('disables the complete runtime form while writing and keeps classified failure inside it', () => {
    resource.useCollectorController.mockReturnValue(
      buildController({
        runtimeEditor: { record: collector('edge'), config: runtimeConfig() },
        runtimeBusy: true,
        runtimeSaving: true,
        runtimeFailure: 'permission'
      })
    );
    renderPage();

    const dialog = screen.getByRole('dialog', { name: 'Managed runtime for edge' });
    expect(within(dialog).getByText('You do not have permission to change this Collector.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Environment')).toBeDisabled();
    expect(within(dialog).getByLabelText('Host metrics interval (seconds)')).toBeDisabled();
    expect(within(dialog).getByRole('checkbox', { name: 'CPU' })).toBeDisabled();
  });

  it('keeps an invalid runtime draft visibly classified inside the open editor', () => {
    resource.useCollectorController.mockReturnValue(
      buildController({
        runtimeEditor: { record: collector('edge'), config: runtimeConfig() },
        runtimeFailure: 'validation'
      })
    );
    renderPage();

    const dialog = screen.getByRole('dialog', { name: 'Managed runtime for edge' });
    expect(
      within(dialog).getByText('The Collector change was rejected. Review its current server state.')
    ).toBeInTheDocument();
  });

  it('makes legacy upgrade intent explicit and keeps a failed GET distinct from loading', () => {
    const legacy = runtimeConfig({ schemaVersion: 1, environment: '' });
    resource.useCollectorController.mockReturnValue(
      buildController({ runtimeEditor: { record: collector('edge'), config: legacy } })
    );
    renderPage();
    let dialog = screen.getByRole('dialog', { name: 'Managed runtime for edge' });
    expect(within(dialog).getByText('Schema 1 · revision 7')).toBeInTheDocument();
    expect(within(dialog).getByText('Saving upgrades this configuration to schema 3.')).toBeInTheDocument();

    cleanup();
    resource.useCollectorController.mockReturnValue(
      buildController({
        runtimeEditor: { record: collector('edge'), config: null },
        runtimeBusy: false,
        runtimeFailure: 'unavailable'
      })
    );
    renderPage();
    dialog = screen.getByRole('dialog', { name: 'Managed runtime for edge' });
    expect(
      within(dialog).getByText('Runtime config could not be loaded. Close and reopen to retry.')
    ).toBeInTheDocument();
    expect(within(dialog).queryByTestId('runtime-config-loading')).not.toBeInTheDocument();
  });

  it.each([
    ['permission', 'You do not have permission to change this Collector.'],
    ['validation', 'The Collector change was rejected. Review its current server state.'],
    ['unavailable', 'The Collector change could not be verified. Refresh before trying again.'],
    ['error', 'The Collector change failed. Refresh and try again.']
  ] as const)('shows classified %s feedback inside the open intake dialog', (failure, copy) => {
    resource.useCollectorController.mockReturnValue(
      buildController({ intakeFailure: failure, intakeEditor: { record: collector('edge') } })
    );
    renderPage();

    const dialog = screen.getByRole('dialog', { name: 'Instrumentation intake for edge' });
    expect(within(dialog).getByText(copy)).toBeInTheDocument();
  });

  it('requires explicit confirmation and supports cancel without executing the mutation', () => {
    const controller = buildController({
      pendingAction: { action: 'delete', collectors: ['edge'] }
    });
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    const dialog = screen.getByRole('dialog', { name: 'Delete this Collector?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(controller.actions.cancelAction).toHaveBeenCalledTimes(1);
    expect(controller.actions.confirmAction).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(controller.actions.confirmAction).toHaveBeenCalledTimes(1);
  });

  it('keeps batch mutation entry points selection-gated and confirmed', () => {
    const controller = buildController();
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByRole('button', { name: 'Take selected online' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select edge' }));
    expect(controller.actions.toggleSelection).toHaveBeenCalledWith('edge', true);

    resource.useCollectorController.mockReturnValue(buildController({ selected: ['edge'] }));
    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    expect(resource.useCollectorController.mock.results.at(-1)?.value.actions.requestAction).toHaveBeenCalledWith(
      'delete',
      ['edge']
    );
  });

  it.each([
    ['loading', 'collector-loading'],
    ['empty', 'No collectors match the current query.'],
    ['unavailable', 'Collector data is unavailable.'],
    ['error', 'This page could not be loaded. Retry or return to it later.']
  ] as const)('keeps the %s list state honest and distinct', (kind, evidence) => {
    resource.useCollectorController.mockReturnValue(buildController({ listState: { kind } }));
    renderPage();

    if (evidence === 'collector-loading') expect(screen.getByTestId(evidence)).toBeInTheDocument();
    else expect(screen.getByText(evidence)).toBeInTheDocument();
    expect(screen.queryByText('10.0.0.7')).not.toBeInTheDocument();
  });

  it.each([
    ['permission', 'You do not have permission to change this Collector.'],
    ['validation', 'The Collector change was rejected. Review its current server state.']
  ] as const)('shows classified %s feedback without raw server detail', (failure, copy) => {
    resource.useCollectorController.mockReturnValue(buildController({ mutationFailure: failure }));
    renderPage();

    expect(screen.getByText(copy)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('raw detail');
  });
});

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    query: { name: '', pageIndex: 0, pageSize: 8 },
    nameDraft: '',
    listState: {
      kind: 'ready',
      records: [collector('edge'), collector('main-default-collector', true)],
      total: 17
    },
    refreshing: false,
    mutating: false,
    mutationFailure: null,
    intakeFailure: null,
    pendingAction: null,
    intakeEditor: null,
    intakeSaving: false,
    runtimeEditor: null,
    runtimeBusy: false,
    runtimeLoading: false,
    runtimeSaving: false,
    runtimeFailure: null,
    selected: [],
    actions: {
      setNameDraft: vi.fn(),
      submitName: vi.fn(),
      setPage: vi.fn(),
      refresh: vi.fn(),
      requestAction: vi.fn(),
      openIntake: vi.fn(),
      saveIntake: vi.fn(),
      clearIntake: vi.fn(),
      cancelIntake: vi.fn(),
      openRuntimeConfig: vi.fn(),
      saveRuntimeConfig: vi.fn(),
      cancelRuntimeConfig: vi.fn(),
      toggleSelection: vi.fn(),
      toggleAll: vi.fn(),
      cancelAction: vi.fn(),
      confirmAction: vi.fn()
    },
    ...overrides
  };
}

function collector(
  name: string,
  immutable = false,
  instrumentationIntake: CollectorInstrumentationIntake = intakeUnavailable()
) {
  return {
    name,
    address: '10.0.0.7',
    version: '2.0.0',
    mode: 'public',
    online: true,
    immutable,
    pinMonitorNum: 2,
    dispatchMonitorNum: 3,
    updatedAt: '2026-07-22T10:00:00',
    runtimeStatusReportedAt: null,
    instrumentationIntake
  };
}

function intakeAvailable() {
  return {
    status: 'available' as const,
    schemaVersion: 1 as const,
    collectorId: 'edge',
    gateway: 'server' as const,
    capabilities: ['otlp_grpc'] as const,
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: 'https://telemetry.example.test:4317',
    authorizationHeader: 'Authorization' as const
  };
}

function intakeUnavailable(
  errorCode:
    | 'intake_not_advertised'
    | 'intake_advertisement_invalid'
    | 'intake_advertisement_unavailable' = 'intake_not_advertised'
) {
  return { status: 'unavailable' as const, errorCode };
}

function runtimeConfig(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 3 as const,
    revision: 7,
    hostMetricsEnabled: true,
    hostMetricsInterval: 'PT30S',
    hostMetricsIntervalSeconds: 30,
    prometheusTargets: [
      {
        name: 'payments',
        endpoint: 'https://payments.example.test:9464/metrics',
        interval: 'PT30S',
        timeout: 'PT5S',
        headerSecretRefs: { 'X-Scrape-Key': 'payments-key-ref' },
        tlsCaProfile: 'internal-ca'
      }
    ],
    fileLogSources: [{ name: 'payments', pathProfile: 'payments-logs' }],
    prometheusTargetCount: 1,
    fileLogSourceCount: 1,
    environment: 'production',
    resourceDetectors: ['ENV', 'SYSTEM'] as const,
    telemetryFilterPresets: [] as const,
    hostMetricsScrapers: ['CPU', 'MEMORY'] as const,
    ...overrides
  };
}

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/settings/collectors']}>
        <App>
          <CollectorPage />
        </App>
      </MemoryRouter>
    </I18nextProvider>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
