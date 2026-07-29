/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { alertRoutePaths, monitorRoutePaths } from '@/shared/navigation/app-paths';
import { settingsPaths } from '@/shared/settings/settings-routes';
const controller = vi.hoisted(() => ({ useDashboardController: vi.fn() }));
vi.mock('../controller/use-dashboard-controller', () => controller);
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  it('keeps authoritative alert evidence visible when monitor summary is unavailable', () => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind: 'unavailable' },
        alertState: { kind: 'ready', summary: alert(7) },
        refresh: vi.fn()
      })
    );
    renderPage();
    expect(screen.getByText(i18n.t('dashboard.monitorStates.unavailable'))).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('7');
  });

  it('presents unavailable monitors and an authoritative zero alert result as independent rows with registered actions', () => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind: 'unavailable' },
        alertState: { kind: 'empty', summary: alert(0) },
        refresh: vi.fn()
      })
    );
    renderPage();

    const board = screen.getByLabelText(i18n.t('dashboard.operationsSummary'));
    const monitor = within(board).getByLabelText(i18n.t('dashboard.monitorSummary'));
    const alerts = within(board).getByLabelText(i18n.t('dashboard.alertSummary'));
    expect(monitor).toHaveTextContent(i18n.t('dashboard.monitorStates.unavailable'));
    expect(within(monitor).queryByText(/^0$/)).not.toBeInTheDocument();
    expect(alerts).toHaveTextContent('0');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('dashboard.openMonitors') })).toHaveAttribute(
      'href',
      monitorRoutePaths.list
    );
    expect(screen.getByRole('link', { name: i18n.t('dashboard.openAlerts') })).toHaveAttribute(
      'href',
      alertRoutePaths.center
    );
  });

  it('keeps authoritative alert evidence visible while monitor summary loads', () => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind: 'loading' },
        alertState: { kind: 'ready', summary: alert(4) },
        refresh: vi.fn()
      })
    );
    renderPage();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('4');
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).not.toHaveTextContent(/^0$/);
  });

  it('keeps authoritative monitor evidence visible when alert summary fails', () => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind: 'ready', apps: [app] },
        alertState: { kind: 'error' },
        refresh: vi.fn()
      })
    );
    renderPage();
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toHaveTextContent('3');
    expect(screen.getByText(i18n.t('dashboard.alertStates.error'))).toBeInTheDocument();
  });

  it.each([
    ['permission', 'permission'],
    ['contract', 'contract']
  ] as const)('renders monitor %s independently from ready alerts', (kind, messageKey) => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind },
        alertState: { kind: 'ready', summary: alert(2) },
        refresh: vi.fn()
      })
    );
    renderPage();
    expect(screen.getByText(i18n.t(`dashboard.monitorStates.${messageKey}`))).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('2');
  });

  it.each([
    ['permission', 'permission'],
    ['contract', 'contract']
  ] as const)('renders alert %s independently from ready monitors', (kind, messageKey) => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind: 'ready', apps: [app] },
        alertState: { kind },
        refresh: vi.fn()
      })
    );
    renderPage();
    expect(screen.getByText(i18n.t(`dashboard.alertStates.${messageKey}`))).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toHaveTextContent('3');
  });

  it('never manufactures zero for pending or failed sections', () => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind: 'loading' },
        alertState: { kind: 'unavailable' },
        refresh: vi.fn()
      })
    );
    renderPage();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it('renders zero only from each authoritative empty response', () => {
    controller.useDashboardController.mockReturnValue(
      withCollector({
        monitorState: { kind: 'empty', apps: [] },
        alertState: { kind: 'empty', summary: alert(0) },
        refresh: vi.fn()
      })
    );
    renderPage();
    const monitor = screen.getByLabelText(i18n.t('dashboard.monitorSummary'));
    expect(monitor).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('0');
    expect(within(monitor).getByText(i18n.t('dashboard.empty'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('dashboard.distribution'))).not.toBeInTheDocument();
  });

  it('renders read-only collector status without hiding ready monitor and alert evidence', () => {
    controller.useDashboardController.mockReturnValue(
      withCollector(
        {
          monitorState: { kind: 'ready', apps: [app] },
          alertState: { kind: 'ready', summary: alert(3) },
          refresh: vi.fn()
        },
        { kind: 'ready', records: [collector], total: 1 }
      )
    );
    renderPage();

    const collectorEvidence = screen.getByLabelText(i18n.t('collectors.title'));
    expect(within(collectorEvidence).getByText('edge-a')).toBeInTheDocument();
    expect(within(collectorEvidence).getByText(i18n.t('collectors.online'))).toBeInTheDocument();
    expect(within(collectorEvidence).getByText('5')).toBeInTheDocument();
    expect(within(collectorEvidence).getByText('1 / 1')).toBeInTheDocument();
    expect(within(collectorEvidence).queryByRole('link')).not.toBeInTheDocument();
    expect(within(collectorEvidence).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toHaveTextContent('3');
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('3');
  });

  it('labels a truncated collector preview and links to the management route', () => {
    const records = Array.from({ length: 8 }, (_, index) => ({
      ...collector,
      name: `edge-${index + 1}`
    }));
    controller.useDashboardController.mockReturnValue(
      withCollector(
        {
          monitorState: { kind: 'ready', apps: [app] },
          alertState: { kind: 'ready', summary: alert(3) },
          refresh: vi.fn()
        },
        { kind: 'ready', records, total: 9 }
      )
    );
    renderPage();

    const collectorEvidence = screen.getByLabelText(i18n.t('collectors.title'));
    expect(within(collectorEvidence).getByText('8 / 9')).toBeInTheDocument();
    expect(within(collectorEvidence).getAllByRole('row')).toHaveLength(9);
    expect(within(collectorEvidence).getByRole('link', { name: i18n.t('common.view') })).toHaveAttribute(
      'href',
      settingsPaths.collectors
    );
    expect(within(collectorEvidence).queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['loading', null],
    ['empty', 'collectors.empty'],
    ['permission', 'common.permission.roleRequiredDescription'],
    ['unavailable', 'collectors.unavailable'],
    ['error', 'common.routeError.description']
  ] as const)('renders collector %s independently from ready summaries', (kind, messageKey) => {
    controller.useDashboardController.mockReturnValue(
      withCollector(
        {
          monitorState: { kind: 'ready', apps: [app] },
          alertState: { kind: 'ready', summary: alert(2) },
          refresh: vi.fn()
        },
        { kind }
      )
    );
    renderPage();

    const collectorEvidence = screen.getByLabelText(i18n.t('collectors.title'));
    if (messageKey) expect(collectorEvidence).toHaveTextContent(i18n.t(messageKey));
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toHaveTextContent('3');
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('2');
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

const app = { app: 'mysql', category: 'db', size: 3, availableSize: 2, unAvailableSize: 1, unManageSize: 0 };
const collector = {
  name: 'edge-a',
  address: '10.0.0.8',
  version: '2.0.0',
  mode: 'public',
  online: true,
  immutable: false,
  pinMonitorNum: 2,
  dispatchMonitorNum: 3,
  updatedAt: '2026-07-29T10:00:00Z',
  runtimeReport: null,
  instrumentationIntake: { status: 'unavailable', errorCode: 'intake_not_advertised' }
};
function withCollector<T extends object>(value: T, collectorState: object = { kind: 'empty' }) {
  return { ...value, collectorState };
}
function alert(total: number) {
  return {
    total,
    dealNum: 0,
    rate: total === 0 ? 100 : 0,
    priorityWarningNum: 0,
    priorityCriticalNum: 0,
    priorityEmergencyNum: 0
  };
}
