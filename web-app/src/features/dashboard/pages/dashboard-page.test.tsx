/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import {
  alertRoutePaths,
  applicationRoutePaths,
  buildMonitorCreatePath,
  monitorRoutePaths
} from '@/shared/navigation/app-paths';
import { settingsPaths } from '@/shared/settings/settings-routes';

const start = vi.hoisted(() => ({ useDashboardStartController: vi.fn() }));
const dashboard = vi.hoisted(() => ({ useDashboardController: vi.fn() }));
const runtime = vi.hoisted(() => ({ useRuntimeStatusController: vi.fn() }));
vi.mock('../controller/use-dashboard-start-controller', () => start);
vi.mock('../controller/use-dashboard-controller', () => dashboard);
vi.mock('@/features/runtime-status', () => runtime);

import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    start.useDashboardStartController.mockReturnValue(startController(true));
    dashboard.useDashboardController.mockReturnValue(dashboardController());
    runtime.useRuntimeStatusController.mockReturnValue(runtimeReady());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps both collection paths first and follows them with compact operational evidence', () => {
    start.useDashboardStartController.mockReturnValue(startController(true));
    dashboard.useDashboardController.mockReturnValue(dashboardController());
    runtime.useRuntimeStatusController.mockReturnValue(runtimeReady());
    renderPage();

    const startSurface = screen.getByTestId('dashboard-start');
    const summary = screen.getByTestId('dashboard-operational-summary');
    expect(dashboard.useDashboardController).toHaveBeenCalledWith('summary');
    expect(startSurface.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(summary).getByLabelText(i18n.t('dashboard.runtimeSummary'))).toBeInTheDocument();
    expectMetric(
      within(summary).getByLabelText(i18n.t('dashboard.monitorSummary')),
      i18n.t('dashboard.unavailable'),
      '1'
    );
    expectMetric(
      within(summary).getByLabelText(i18n.t('dashboard.alertSummary')),
      i18n.t('dashboard.unresolvedAlerts'),
      '5'
    );
  });

  it('keeps successful sources visible when runtime and monitor evidence fail independently', () => {
    start.useDashboardStartController.mockReturnValue(startController(true));
    dashboard.useDashboardController.mockReturnValue(dashboardController({ monitorState: { kind: 'unavailable' } }));
    runtime.useRuntimeStatusController.mockReturnValue({
      state: 'request-failed',
      snapshot: null,
      failure: 'error'
    });
    renderPage();

    expect(screen.getByText(i18n.t('dashboard.runtimeStates.error'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('dashboard.monitorStates.unavailable'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('dashboard.openCollectors') })).toHaveAttribute(
      'href',
      settingsPaths.collectors
    );
    expectMetric(screen.getByLabelText(i18n.t('dashboard.alertSummary')), i18n.t('dashboard.unresolvedAlerts'), '5');
  });

  it('does not offer a route action for a source whose read permission was denied', () => {
    start.useDashboardStartController.mockReturnValue(startController(true));
    dashboard.useDashboardController.mockReturnValue(dashboardController({ monitorState: { kind: 'permission' } }));
    runtime.useRuntimeStatusController.mockReturnValue({
      state: 'request-failed',
      snapshot: null,
      failure: 'permission'
    });
    renderPage();

    const summary = screen.getByTestId('dashboard-operational-summary');
    expect(within(summary).queryByRole('link', { name: i18n.t('dashboard.openMonitors') })).not.toBeInTheDocument();
    expect(within(summary).queryByRole('link', { name: i18n.t('dashboard.openCollectors') })).not.toBeInTheDocument();
    expect(within(summary).getByRole('link', { name: i18n.t('dashboard.openAlerts') })).toHaveAttribute(
      'href',
      alertRoutePaths.center
    );
  });

  it('keeps authoritative empty evidence separate from loading without manufacturing counters', () => {
    dashboard.useDashboardController.mockReturnValue(
      dashboardController({
        monitorState: { kind: 'empty', apps: [] },
        alertState: { kind: 'empty', summary: alertSummary(4, 4) }
      })
    );
    runtime.useRuntimeStatusController.mockReturnValue({ state: 'loading', snapshot: null });
    renderPage();

    const monitor = screen.getByLabelText(i18n.t('dashboard.monitorSummary'));
    const alerts = screen.getByLabelText(i18n.t('dashboard.alertSummary'));
    expect(monitor).toHaveTextContent(i18n.t('dashboard.empty'));
    expect(alerts).toHaveTextContent(i18n.t('dashboard.alertEmpty'));
    expect(within(monitor).queryByText(/^0$/)).not.toBeInTheDocument();
    expect(within(alerts).queryByText(/^0$/)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(i18n.t('dashboard.runtimeSummary')).querySelector('.ant-skeleton')
    ).toBeInTheDocument();
  });

  it('suppresses only the alert-center action when alert evidence is permission denied', () => {
    dashboard.useDashboardController.mockReturnValue(dashboardController({ alertState: { kind: 'permission' } }));
    renderPage();

    const summary = screen.getByTestId('dashboard-operational-summary');
    expect(within(summary).queryByRole('link', { name: i18n.t('dashboard.openAlerts') })).not.toBeInTheDocument();
    expect(within(summary).getByRole('link', { name: i18n.t('dashboard.openMonitors') })).toHaveAttribute(
      'href',
      monitorRoutePaths.list
    );
    expect(within(summary).getByRole('link', { name: i18n.t('dashboard.openCollectors') })).toHaveAttribute(
      'href',
      settingsPaths.collectors
    );
  });

  it('presents exactly the active-monitoring and telemetry entry paths without invented status', () => {
    start.useDashboardStartController.mockReturnValue(startController(true));
    renderPage();

    expect(screen.getAllByTestId('dashboard-entry')).toHaveLength(2);
    const active = screen.getByTestId('active-monitoring-entry').closest('section') as HTMLElement;
    const telemetry = screen.getByTestId('telemetry-entry');
    expect(active).toHaveTextContent('MySQL');
    expect(active).toHaveTextContent('Linux');
    expect(active).toHaveTextContent('Redis');
    expect(active).toHaveTextContent('HTTP');
    expect(telemetry).toHaveTextContent('Java');
    expect(telemetry).toHaveTextContent('.NET');
    expect(telemetry).toHaveTextContent('Node.js');
    expect(telemetry).toHaveTextContent(i18n.t('dashboard.start.telemetry.sources.collector'));
    expect(screen.getAllByTestId('flow-direction')).toHaveLength(2);
    expect(screen.getByLabelText(i18n.t('dashboard.start.active.flowLabel'))).toHaveAttribute(
      'data-direction',
      'forward'
    );
    expect(screen.getByLabelText(i18n.t('dashboard.start.telemetry.flowLabel'))).toHaveAttribute(
      'data-direction',
      'reverse'
    );
    expect(screen.queryByText(/\d+(?:\.\d+)?%/)).not.toBeInTheDocument();
  });

  it('routes both primary actions through canonical shared paths', () => {
    const controller = startController(true);
    start.useDashboardStartController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByRole('link', { name: i18n.t('dashboard.start.active.action') })).toHaveAttribute(
      'href',
      buildMonitorCreatePath({ returnTo: applicationRoutePaths.dashboard })
    );
    expect(screen.getByRole('link', { name: i18n.t('dashboard.start.telemetry.action') })).toHaveAttribute(
      'href',
      applicationRoutePaths.instrumentation
    );
    fireEvent.click(screen.getByRole('link', { name: i18n.t('dashboard.start.active.action') }));
    fireEvent.click(screen.getByRole('link', { name: i18n.t('dashboard.start.telemetry.action') }));
    expect(controller.openCreateMonitor).toHaveBeenCalledOnce();
    expect(controller.openTelemetry).toHaveBeenCalledOnce();
  });

  it('keeps the monitor creation action out of the GUEST read-only entry while retaining telemetry', () => {
    const controller = startController(false);
    start.useDashboardStartController.mockReturnValue(controller);
    renderPage();

    const active = screen.getByTestId('active-monitoring-entry').closest('section') as HTMLElement;
    expect(
      within(active).queryByRole('link', { name: i18n.t('dashboard.start.active.action') })
    ).not.toBeInTheDocument();
    expect(within(active).getByText(i18n.t('dashboard.start.active.readOnly'))).toBeInTheDocument();
    const readOnlyEntry = within(active).getByRole('link', { name: i18n.t('dashboard.openMonitors') });
    expect(readOnlyEntry).toHaveAttribute('href', monitorRoutePaths.list);
    fireEvent.click(readOnlyEntry);
    expect(controller.openMonitors).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: i18n.t('dashboard.start.telemetry.action') })).toHaveAttribute(
      'href',
      applicationRoutePaths.instrumentation
    );
  });

  it('omits redundant decision and convergence explanations between the two entry paths', () => {
    start.useDashboardStartController.mockReturnValue(startController(true));
    renderPage();

    expect(screen.getByTestId('dashboard-start').children).toHaveLength(2);
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <DashboardPage />
      </I18nextProvider>
    </MemoryRouter>
  );
}

function startController(canCreateMonitor: boolean) {
  return {
    canCreateMonitor,
    createMonitorTarget: buildMonitorCreatePath({ returnTo: applicationRoutePaths.dashboard }),
    monitorListTarget: monitorRoutePaths.list,
    telemetryTarget: applicationRoutePaths.instrumentation,
    openCreateMonitor: vi.fn(),
    openMonitors: vi.fn(),
    openTelemetry: vi.fn()
  };
}

function dashboardController(overrides: Record<string, unknown> = {}) {
  return {
    monitorState: {
      kind: 'ready',
      apps: [{ app: 'mysql', category: 'database', size: 4, availableSize: 2, unAvailableSize: 1, unManageSize: 1 }]
    },
    alertState: {
      kind: 'ready',
      summary: {
        total: 7,
        dealNum: 2,
        rate: 28.57,
        priorityWarningNum: 2,
        priorityCriticalNum: 2,
        priorityEmergencyNum: 1
      }
    },
    recentAlertState: { kind: 'empty' },
    collectorState: { kind: 'empty' },
    labelState: { kind: 'empty' },
    refresh: vi.fn(),
    ...overrides
  };
}

function alertSummary(total: number, dealNum: number) {
  return {
    total,
    dealNum,
    rate: (dealNum / total) * 100,
    priorityWarningNum: 0,
    priorityCriticalNum: 0,
    priorityEmergencyNum: 0
  };
}

function runtimeReady() {
  return {
    state: 'ready',
    snapshot: {
      observedAt: '2026-08-05T10:00:00Z',
      server: { status: 'available', errorCode: null },
      storage: { kind: 'greptime', status: 'degraded', errorCode: 'storage_query_failed' },
      collectors: {
        status: 'available',
        errorCode: null,
        total: 2,
        online: 2,
        runtimeHealthy: 1,
        lastReportedAt: '2026-08-05T09:59:00Z'
      }
    }
  };
}

function expectMetric(container: HTMLElement, label: string, value: string) {
  const term = within(container).getByText(label);
  expect(term.nextElementSibling).toHaveTextContent(value);
}
