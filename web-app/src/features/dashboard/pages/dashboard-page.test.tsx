/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { applicationRoutePaths, buildMonitorCreatePath } from '@/shared/navigation/app-paths';
const hooks = vi.hoisted(() => ({ useDashboardStartController: vi.fn() }));
vi.mock('../controller/use-dashboard-start-controller', () => hooks);
import { DashboardPage } from './dashboard-page';

function controller(canCreateMonitor = true) {
  const pending = { isPending: true, isFetching: false, isSuccess: false, error: null };
  return {
    attentionRotation: {
      activeIndex: 0,
      metricCount: 0,
      metricExiting: false,
      metricRemainingMs: 8000,
      metricPaused: false,
      setMetricPaused: vi.fn(),
      setMetricInteracting: vi.fn(),
      nextMetric: vi.fn(),
      previousMetric: vi.fn()
    },
    canCreateMonitor,
    createMonitorTarget: buildMonitorCreatePath({ returnTo: applicationRoutePaths.dashboard }),
    telemetryTarget: applicationRoutePaths.instrumentation,
    monitorListTarget: '/monitors',
    savedQueriesTarget: '/explore?signal=metrics&timeRange=last-15m#saved-queries',
    overview: {
      distribution: { total: 10, counts: [1, 5, 2] },
      monitorState: 'ready',
      downMonitors: [],
      downState: 'ready',
      alerts: [],
      alertState: 'ready',
      savedState: 'ready',
      continueItems: [],
      recordOpen: vi.fn(),
      refreshing: false,
      refresh: vi.fn()
    },
    signals: {
      favoriteState: 'ready',
      clock: { start: 1000, end: 901000 },
      serviceName: '',
      environment: '',
      options: [],
      catalogState: 'ready',
      setService: vi.fn(),
      setEnvironment: vi.fn(),
      metric: undefined,
      active: undefined,
      metricCount: 0,
      logs: pending,
      traces: pending,
      rank: pending,
      records: pending,
      rankPaused: false,
      selected: null,
      setRankPaused: vi.fn(),
      setRankInteracting: vi.fn(),
      setMetricInteracting: vi.fn(),
      setSelected: vi.fn(),
      refresh: vi.fn()
    }
  };
}
function renderPage() {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <DashboardPage />
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe('V2 start page', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => hooks.useDashboardStartController.mockReturnValue(controller()));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  it('shows problems directly and light history without numeric headings or table headers', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      overview: {
        ...start.overview,
        alertTotal: 4,
        alerts: [
          {
            id: 1,
            alerts: [],
            status: 'firing',
            commonLabels: { 'service.name': 'checkout', severity: 'info' },
            commonAnnotations: { summary: 'Capacity notice' }
          }
        ]
      }
    });
    renderPage();
    const attention = screen.getByRole('region', { name: i18n.t('dashboard.v2.attention') });
    expect(within(attention).queryByRole('heading')).not.toBeInTheDocument();
    expect(within(attention).queryByText(i18n.t('dashboard.v3.description'))).not.toBeInTheDocument();
    expect(within(attention).getByRole('link', { name: /Capacity notice/ })).toHaveAttribute('data-severity', 'info');
    const history = screen.getByRole('region', { name: i18n.t('dashboard.v2.continue') });
    expect(within(history).getByRole('heading').textContent).toBe(i18n.t('dashboard.v2.continue'));
    expect(within(history).queryByText(i18n.t('dashboard.v3.type'))).not.toBeInTheDocument();
  });

  it('shows only two attention rows and exposes the same pause and navigation controls as metrics', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      attentionRotation: { ...start.attentionRotation, metricCount: 3 },
      overview: {
        ...start.overview,
        alerts: Array.from({ length: 5 }, (_, id) => ({ id, alerts: [], commonLabels: { alertname: `alarm-${id}` } }))
      }
    });
    renderPage();
    const attention = screen.getByRole('region', { name: /Alerts/ });
    expect(within(attention).getByRole('link', { name: /alarm-0/ })).toBeVisible();
    expect(within(attention).getByRole('link', { name: /alarm-1/ })).toBeVisible();
    expect(within(attention).queryByRole('link', { name: /alarm-2/ })).not.toBeInTheDocument();
    fireEvent.click(within(attention).getByRole('button', { name: i18n.t('dashboard.v2.next') }));
    expect(start.attentionRotation.nextMetric).toHaveBeenCalledOnce();
    fireEvent.mouseEnter(attention);
    expect(start.attentionRotation.setMetricInteracting).toHaveBeenCalledWith(true);
  });

  it.each([0, 1, 2])('keeps mixed alert/monitor groups to two rows, including the odd final group (%i)', page => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      attentionRotation: { ...start.attentionRotation, activeIndex: page, metricCount: 3 },
      overview: {
        ...start.overview,
        alerts: Array.from({ length: 3 }, (_, id) => ({ id, alerts: [], commonLabels: { alertname: `alarm-${id}` } })),
        downMonitors: [
          { id: 10, name: 'monitor-a', app: 'port' },
          { id: 11, name: 'monitor-b', app: 'port' }
        ]
      }
    });
    renderPage();
    const attention = screen.getByRole('region', { name: /Alerts/ });
    const rows = within(attention)
      .getAllByRole('link')
      .filter(link => link.hasAttribute('data-severity'));
    expect(rows).toHaveLength(page === 2 ? 1 : 2);
    const expected = [['alarm-0', 'alarm-1'], ['alarm-2', 'monitor-a'], ['monitor-b']][page]!;
    expected.forEach((name, index) => expect(rows[index]).toHaveTextContent(name));
  });

  it.each(['loading', 'error'])('does not offer the empty metric action while favorites are %s', state => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      signals: { ...start.signals, favoriteState: state }
    });
    renderPage();
    const metric = screen.getByRole('region', { name: i18n.t('dashboard.workspace.signals.metrics.title') });
    expect(within(metric).queryByRole('link', { name: i18n.t('dashboard.v2.chooseMetric') })).not.toBeInTheDocument();
    expect(within(metric).getByRole('status')).toHaveTextContent(
      i18n.t(state === 'loading' ? 'dashboard.v2.loading' : 'dashboard.v2.unavailable')
    );
  });

  it('removes redundant headings and presents the empty metric action as a centered button', () => {
    renderPage();
    expect(screen.queryByRole('link', { name: i18n.t('dashboard.v2.explore') })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: i18n.t('dashboard.daily.title') })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: i18n.t('dashboard.v3.signalOverview') })).not.toBeInTheDocument();
    const metric = screen.getByRole('region', { name: i18n.t('dashboard.workspace.signals.metrics.title') });
    expect(within(metric).getByRole('link', { name: i18n.t('dashboard.v2.chooseMetric') })).toHaveClass('ant-btn');
  });

  it('places signal evidence before recent work and collapses truly empty attention to one line', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      overview: { ...start.overview, distribution: { total: 10, counts: [1, 5, 0] } }
    });
    renderPage();
    const signals = screen.getByRole('region', { name: i18n.t('dashboard.v3.signalOverview') });
    const recent = screen.getByRole('region', { name: new RegExp(i18n.t('dashboard.v2.continue')) });
    expect(signals.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const attention = screen.getByRole('region', { name: new RegExp(i18n.t('dashboard.v2.attention')) });
    expect(within(attention).getByText(i18n.t('dashboard.v2.noAttention'))).toBeVisible();
    expect(within(attention).queryByText(i18n.t('dashboard.v3.status'))).not.toBeInTheDocument();
  });

  it.each(['loading', 'error'])('retains %s attention evidence instead of reporting no alerts', state => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({ ...start, overview: { ...start.overview, alertState: state } });
    renderPage();
    const attention = screen.getByRole('region', { name: new RegExp(i18n.t('dashboard.v2.attention')) });
    expect(within(attention).queryByText(i18n.t('dashboard.v2.noAttention'))).not.toBeInTheDocument();
    expect(within(attention).getByText(i18n.t(`dashboard.workspace.states.${state}`))).toBeVisible();
    expect(within(attention).queryByRole('heading')).not.toBeInTheDocument();
  });

  it('keeps zero monitors explicit without percentages, placeholder dashes or duplicated navigation', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      overview: { ...start.overview, distribution: { total: 0, counts: [0, 0, 0] } }
    });
    renderPage();
    const region = screen.getByRole('region', { name: i18n.t('dashboard.v2.monitorStatus') });
    expect(within(region).getByRole('link', { name: `${i18n.t('dashboard.daily.monitors.title')} 0` })).toHaveAttribute(
      'href',
      '/monitors'
    );
    expect(region.textContent).not.toMatch(/—|%/);
    expect(within(region).queryByText(i18n.t('dashboard.openMonitors'))).not.toBeInTheDocument();
    const attention = screen.getByRole('region', { name: i18n.t('dashboard.v2.attention') });
    expect(within(attention).queryByRole('heading')).not.toBeInTheDocument();
  });
  it('retains actionable anomaly evidence without a combined total heading', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      overview: {
        ...start.overview,
        alertTotal: 8,
        alerts: [{ id: 17, alerts: [], commonLabels: { alertname: 'CPU pressure' } }],
        downMonitors: [{ id: 29, name: 'Database', app: 'mysql', description: 'Development seed description' }]
      }
    });
    renderPage();
    const attention = screen.getByRole('region', { name: new RegExp(i18n.t('dashboard.v2.attention')) });
    expect(within(attention).queryByRole('heading')).not.toBeInTheDocument();
    expect(within(attention).getByRole('link', { name: /CPU pressure/ })).toHaveAttribute(
      'href',
      '/alerts?status=firing'
    );
    expect(within(attention).getByRole('link', { name: /Database/ })).toHaveAttribute('href', '/monitors/29');
    expect(within(attention).getByRole('link', { name: /Database/ })).toHaveAttribute('data-severity', 'unavailable');
    expect(within(attention).getByText('Development seed description')).toBeVisible();
    expect(within(attention).queryByText(i18n.t('dashboard.v2.noAttention'))).not.toBeInTheDocument();
  });

  it.each(['error', 'ready'])(
    'does not fabricate a total for an unreadable monitor distribution (%s)',
    monitorState => {
      const start = controller();
      hooks.useDashboardStartController.mockReturnValue({
        ...start,
        overview: { ...start.overview, distribution: null, monitorState }
      });
      renderPage();
      const region = screen.getByRole('region', { name: i18n.t('dashboard.v2.monitorStatus') });
      expect(
        within(region).getByRole('link', {
          name: `${i18n.t('dashboard.daily.monitors.title')} ${i18n.t('dashboard.workspace.states.error')}`
        })
      ).toBeVisible();
      expect(region.textContent).not.toMatch(/0|%/);
    }
  );
  it.each(['loading', 'error'])(
    'does not report a healthy empty state while unavailable monitors are %s',
    downState => {
      const start = controller();
      hooks.useDashboardStartController.mockReturnValue({
        ...start,
        overview: { ...start.overview, distribution: null, downState }
      });
      renderPage();
      const attention = screen.getByRole('region', { name: i18n.t('dashboard.v2.attention') });
      expect(within(attention).queryByText(i18n.t('dashboard.v2.noAttention'))).not.toBeInTheDocument();
      expect(within(attention).getByText(i18n.t(`dashboard.workspace.states.${downState}`))).toBeVisible();
    }
  );

  it('offers canonical creation/intake actions directly at the top right without redundant toolbar actions', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue(start);
    renderPage();
    expect(screen.getByRole('link', { name: i18n.t('dashboard.start.active.action') })).toHaveAttribute(
      'href',
      start.createMonitorTarget
    );
    expect(screen.getByRole('link', { name: i18n.t('dashboard.start.telemetry.action') })).toHaveAttribute(
      'href',
      start.telemetryTarget
    );
    expect(screen.queryByRole('link', { name: i18n.t('exploreSaved.directory') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('common.refresh') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('dashboard.v3.moreActions') })).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('hides creation from guests while retaining read-only navigation', () => {
    hooks.useDashboardStartController.mockReturnValue(controller(false));
    renderPage();
    expect(screen.queryByRole('link', { name: i18n.t('dashboard.start.active.action') })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('dashboard.start.telemetry.action') })).toHaveAttribute(
      'href',
      applicationRoutePaths.instrumentation
    );
  });
  it('shows three backend availability counters with total-based percentages and exact filters', () => {
    renderPage();
    const region = screen.getByRole('region', { name: i18n.t('dashboard.v2.monitorStatus') });
    expect(within(region).queryByText(/Unknown status/)).not.toBeInTheDocument();
    expect(within(region).queryByText(i18n.t('monitor.status.pending'))).not.toBeInTheDocument();
    expect(
      within(region).getByRole('link', { name: `${i18n.t('dashboard.daily.monitors.title')} 10` })
    ).toHaveAttribute('href', '/monitors');
    expect(within(region).getByText('50%')).toBeVisible();
    expect(within(region).getAllByText('20%')).toHaveLength(2);
    expect(within(region).getByText('10%')).toBeVisible();
    for (const [index, name] of ['paused', 'available', 'unavailable'].entries()) {
      expect(within(region).getByRole('link', { name: new RegExp(i18n.t(`monitor.status.${name}`)) })).toHaveAttribute(
        'href',
        `/monitors?status=${index}`
      );
    }
  });
  it('shows unavailable/loading evidence without inventing monitor totals or favorite history', () => {
    const start = controller();
    const changed = {
      ...start,
      overview: { ...start.overview, distribution: null, monitorState: 'loading', savedState: 'error' }
    };
    hooks.useDashboardStartController.mockReturnValue(changed);
    renderPage();
    const region = screen.getByRole('region', { name: i18n.t('dashboard.v2.monitorStatus') });
    expect(
      within(region).getByRole('link', {
        name: `${i18n.t('dashboard.daily.monitors.title')} ${i18n.t('dashboard.workspace.states.loading')}`
      })
    ).toBeVisible();
    expect(within(region).queryByRole('link', { name: '0' })).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('dashboard.v2.noContinue'))).not.toBeInTheDocument();
  });
  it('omits redundant time captions from log and trace headers', () => {
    renderPage();
    for (const signal of ['logs', 'traces']) {
      const region = screen.getByRole('region', { name: i18n.t(`dashboard.workspace.signals.${signal}.title`) });
      expect(within(region).queryByText(i18n.t('dashboard.v2.last15m'))).not.toBeInTheDocument();
    }
  });
  it('keeps the overview free of service and environment selectors', () => {
    renderPage();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('dashboard.v2.pause') })).not.toBeInTheDocument();
  });
  it('uses actual horizontal shares and distinguishes alert groups from unavailable monitors', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({ ...start, overview: { ...start.overview, alertTotal: 4 } });
    renderPage();
    const bar = screen.getByRole('img', { name: i18n.t('dashboard.v3.monitorDistribution') });
    expect(bar.tagName).toBe('DIV');
    expect(bar.querySelector('[data-status="available"]')).toHaveStyle({ width: '50%' });
    expect(bar.querySelector('[data-status="unavailable"]')).toHaveStyle({ width: '20%' });
    expect(bar.querySelector('[data-status="paused"]')).toHaveStyle({ width: '10%' });
    expect(screen.getByText(i18n.t('dashboard.v3.otherStatus'))).toBeVisible();
    expect(screen.getByText(i18n.t('dashboard.v3.firingGroups', { count: 4 }))).toBeVisible();
    expect(screen.getByText(i18n.t('dashboard.v3.unavailableMonitors', { count: 2 }))).toBeVisible();
  });
  it('carries the preview window and scope into every signal destination', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      signals: { ...start.signals, serviceName: 'checkout', environment: 'preview' }
    });
    renderPage();
    for (const signal of ['metrics', 'logs', 'traces']) {
      const region = screen.getByRole('region', { name: i18n.t(`dashboard.workspace.signals.${signal}.title`) });
      const href = within(region)
        .getByRole('link', { name: i18n.t('dashboard.v3.openExplore') })
        .getAttribute('href')!;
      const params = new URL(href, 'http://localhost').searchParams;
      expect(params.get('start')).toBe(String(start.signals.clock.start));
      expect(params.get('end')).toBe(String(start.signals.clock.end));
      expect(params.get('serviceName')).toBe('checkout');
      expect(params.get('environment')).toBe('preview');
    }
  });
  it('links all signals to real 15-minute destinations', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue(start);
    renderPage();
    for (const signal of ['metrics', 'logs', 'traces']) {
      const region = screen.getByRole('region', { name: i18n.t(`dashboard.workspace.signals.${signal}.title`) });
      expect(
        within(region)
          .getByRole('link', { name: i18n.t('dashboard.v3.openExplore') })
          .getAttribute('href')
      ).toContain(`signal=${signal}&timeRange=last-15m`);
    }
  });
  it('shows at most three continue entries without removing the all-query entry', () => {
    const start = controller();
    hooks.useDashboardStartController.mockReturnValue({
      ...start,
      overview: {
        ...start.overview,
        continueItems: Array.from({ length: 4 }, (_, index) => ({
          record: { viewKey: String(index), label: `view-${index}`, signal: 'metrics', description: null },
          favorite: index < 2,
          target: `/explore?savedView=${index}`
        }))
      }
    });
    renderPage();
    expect(screen.getByText('view-0')).toBeVisible();
    expect(screen.getByText('view-2')).toBeVisible();
    expect(screen.queryByText('view-3')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('dashboard.v3.allQueries') })).toHaveAttribute(
      'href',
      start.savedQueriesTarget
    );
  });
});
