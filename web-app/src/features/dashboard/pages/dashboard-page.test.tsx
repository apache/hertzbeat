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
  beforeAll(async () => { await initializeI18n(); await loadLocale('en-US'); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it.each(['loading', 'missing', 'unavailable', 'error'] as const)('never renders Results or fake zero for %s', kind => {
    controller.useDashboardController.mockReturnValue({ state: { kind }, refresh: vi.fn() });
    renderPage();
    expect(screen.queryByLabelText(i18n.t('dashboard.monitorSummary'))).not.toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });
  it('renders zero only from authoritative empty responses', () => {
    controller.useDashboardController.mockReturnValue({ state: { kind: 'empty', data: { apps: [], alert: {
      total: 0, dealNum: 0, rate: 0, priorityWarningNum: 0, priorityCriticalNum: 0, priorityEmergencyNum: 0
    } } }, refresh: vi.fn() });
    renderPage();
    expect(screen.getByLabelText(i18n.t('dashboard.monitorSummary'))).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('dashboard.empty'))).toBeInTheDocument();
  });
});
function renderPage() { return render(<I18nextProvider i18n={i18n}><DashboardPage /></I18nextProvider>); }
