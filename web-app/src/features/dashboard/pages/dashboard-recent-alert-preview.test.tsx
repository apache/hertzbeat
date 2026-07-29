/*
 * Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const controller = vi.hoisted(() => ({ useDashboardController: vi.fn() }));
vi.mock('../controller/use-dashboard-controller', () => controller);

import { DashboardPage } from './dashboard-page';

describe('Dashboard recent firing-alert preview', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders at most ten records in server order with honest fallbacks and no actions', () => {
    controller.useDashboardController.mockReturnValue(
      dashboardState({
        kind: 'ready',
        records: [
          recentAlert(1, 'First from server', 1_000),
          recentAlert(2, 'Second from server', 2_000),
          {
            ...recentAlert(3, '', null),
            labels: null,
            content: null
          },
          ...Array.from({ length: 8 }, (_, index) => recentAlert(index + 4, `Alert ${index + 4}`, 3_000 + index))
        ],
        total: 18
      })
    );
    renderPage();

    const preview = screen.getByLabelText(i18n.t('dashboard.recentAlerts.title'));
    const rows = within(preview).getAllByRole('listitem');
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent('First from server');
    expect(rows[1]).toHaveTextContent('Second from server');
    expect(preview).not.toHaveTextContent('Alert 11');
    expect(preview).toHaveTextContent('#3');
    expect(preview).toHaveTextContent(i18n.t('dashboard.recentAlerts.notReported'));
    expect(preview).toHaveTextContent(i18n.t('dashboard.recentAlerts.noContent'));
    expect(preview).toHaveTextContent(i18n.t('alert.severity.critical'));
    expect(preview).toHaveTextContent(
      new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(1_000)
    );
    expect(preview).toHaveTextContent(i18n.t('dashboard.recentAlerts.preview', { shown: 10, total: 18 }));
    expect(within(preview).queryByRole('button')).not.toBeInTheDocument();
    expect(within(preview).queryByRole('link')).not.toBeInTheDocument();
  });

  it.each([
    ['empty', 'dashboard.recentAlerts.empty'],
    ['permission', 'dashboard.recentAlerts.states.permission'],
    ['unavailable', 'dashboard.recentAlerts.states.unavailable'],
    ['contract', 'dashboard.recentAlerts.states.contract'],
    ['error', 'dashboard.recentAlerts.states.error']
  ] as const)('renders recent-alert %s independently', (kind, messageKey) => {
    controller.useDashboardController.mockReturnValue(dashboardState({ kind }));
    renderPage();

    const preview = screen.getByLabelText(i18n.t('dashboard.recentAlerts.title'));
    expect(preview).toHaveTextContent(i18n.t(messageKey));
    if (kind === 'empty') expect(preview.querySelector('.ant-empty')).toBeInTheDocument();
    else {
      expect(preview.querySelector('.ant-empty')).not.toBeInTheDocument();
      expect(
        preview.querySelector(kind === 'error' ? '.ant-typography-danger' : '.ant-typography-secondary')
      ).toBeInTheDocument();
    }
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('3');
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toHaveTextContent('1');
  });

  it('keeps the recent-alert loading state independent from ready summaries', () => {
    controller.useDashboardController.mockReturnValue(dashboardState({ kind: 'loading' }));
    renderPage();

    const preview = screen.getByLabelText(i18n.t('dashboard.recentAlerts.title'));
    expect(preview.querySelector('.ant-skeleton')).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('3');
  });

  it('keeps summary readiness and recent-list availability independent in both directions', () => {
    controller.useDashboardController.mockReturnValue(dashboardState({ kind: 'unavailable' }));
    const view = renderPage();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('3');
    expect(screen.getByLabelText(i18n.t('dashboard.recentAlerts.title'))).toHaveTextContent(
      i18n.t('dashboard.recentAlerts.states.unavailable')
    );

    controller.useDashboardController.mockReturnValue(
      dashboardState({ kind: 'ready', records: [recentAlert(1, 'Still visible', 1_000)], total: 1 }, 'unavailable')
    );
    view.rerender(pageTree());
    expect(screen.getByText(i18n.t('dashboard.alertStates.unavailable'))).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.recentAlerts.title'))).toHaveTextContent('Still visible');
  });
});

function dashboardState(recentAlertState: object, alertKind: 'ready' | 'unavailable' = 'ready') {
  return {
    monitorState: { kind: 'ready', apps: [app] },
    alertState: alertKind === 'ready' ? { kind: 'ready', summary: alertSummary } : { kind: alertKind },
    recentAlertState,
    labelState: { kind: 'empty' },
    collectorState: { kind: 'empty' },
    refresh: vi.fn()
  };
}

function recentAlert(id: number, alertname: string, activeAt: number | null) {
  return {
    id,
    labels: { alertname, severity: 'critical' },
    annotations: null,
    content: `Content ${id}`,
    status: 'firing' as const,
    triggerTimes: 1,
    startAt: activeAt,
    activeAt,
    endAt: null
  };
}

function renderPage() {
  return render(pageTree());
}

function pageTree() {
  return (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <DashboardPage />
      </I18nextProvider>
    </MemoryRouter>
  );
}

const app = { app: 'mysql', category: 'db', size: 1, availableSize: 1, unAvailableSize: 0, unManageSize: 0 };
const alertSummary = {
  total: 3,
  dealNum: 1,
  rate: 33.33,
  priorityWarningNum: 1,
  priorityCriticalNum: 1,
  priorityEmergencyNum: 0
};
