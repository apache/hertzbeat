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
import { applicationRoutePaths, buildMonitorCreatePath, monitorRoutePaths } from '@/shared/navigation/app-paths';

const start = vi.hoisted(() => ({ useDashboardStartController: vi.fn() }));
vi.mock('../controller/use-dashboard-start-controller', () => start);

import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    start.useDashboardStartController.mockReturnValue(startController(true));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders no bottom operational summary because runtime status belongs to the application header', () => {
    renderPage();

    expect(screen.queryByTestId('dashboard-operational-summary')).not.toBeInTheDocument();
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
