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
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
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
    controller.useDashboardController.mockReturnValue({
      monitorState: { kind: 'unavailable' },
      alertState: { kind: 'ready', summary: alert(7) },
      refresh: vi.fn()
    });
    renderPage();
    expect(screen.getByText(i18n.t('dashboard.monitorStates.unavailable'))).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('7');
  });

  it('keeps authoritative alert evidence visible while monitor summary loads', () => {
    controller.useDashboardController.mockReturnValue({
      monitorState: { kind: 'loading' },
      alertState: { kind: 'ready', summary: alert(4) },
      refresh: vi.fn()
    });
    renderPage();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('4');
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).not.toHaveTextContent(/^0$/);
  });

  it('keeps authoritative monitor evidence visible when alert summary fails', () => {
    controller.useDashboardController.mockReturnValue({
      monitorState: { kind: 'ready', apps: [app] },
      alertState: { kind: 'error' },
      refresh: vi.fn()
    });
    renderPage();
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toHaveTextContent('3');
    expect(screen.getByText(i18n.t('dashboard.alertStates.error'))).toBeInTheDocument();
  });

  it('never manufactures zero for pending or failed sections', () => {
    controller.useDashboardController.mockReturnValue({
      monitorState: { kind: 'loading' },
      alertState: { kind: 'unavailable' },
      refresh: vi.fn()
    });
    renderPage();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it('renders zero only from each authoritative empty response', () => {
    controller.useDashboardController.mockReturnValue({
      monitorState: { kind: 'empty', apps: [] },
      alertState: { kind: 'empty', summary: alert(0) },
      refresh: vi.fn()
    });
    renderPage();
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('dashboard.alertSummary'))).toHaveTextContent('0');
    expect(screen.getByText(i18n.t('dashboard.empty'))).toBeInTheDocument();
  });
});
function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <DashboardPage />
    </I18nextProvider>
  );
}

const app = { app: 'mysql', category: 'db', size: 3, availableSize: 2, unAvailableSize: 1, unManageSize: 0 };
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
