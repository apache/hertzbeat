/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { MonitorMetricCatalogEvidence, MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { MonitorMetricWorkbench } from './monitor-metric-workbench';

const catalogCases: Array<[MonitorMetricCatalogEvidence, string]> = [
  [{ kind: 'fallback', options: [], references: ['summary'] }, 'common.unavailable'],
  [{ kind: 'unavailable', options: [] }, 'common.unavailable'],
  [{ kind: 'error', options: [] }, 'common.routeError.description'],
  [{ kind: 'empty', options: [] }, 'monitorMetrics.noCatalog']
];

describe('MonitorMetricWorkbench', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the selected current-value workspace without detached realtime, history, or favorite tabs', () => {
    const value = controller({
      catalog: {
        kind: 'ready',
        options: [
          { key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' },
          { key: 'availability.status', group: 'availability', field: 'status' }
        ]
      },
      metricKey: 'summary.responseTime',
      favorite: { kind: 'ready', value: true, token: 'summary.responseTime' },
      favoriteCollection: { kind: 'ready', items: [{ key: 'summary', available: true }] },
      realtimeGroupNames: ['summary', 'availability'],
      realtimeGroups: [
        {
          ...realtimeGroup('summary'),
          favorite: { kind: 'ready', value: true, token: 'summary' },
          result: { kind: 'ready', rows: [{ ...metricRow('responseTime', '12'), unit: 'ms' }] }
        },
        {
          ...realtimeGroup('availability'),
          result: { kind: 'ready', rows: [metricRow('status', 'UP')] }
        }
      ],
      realtime: { kind: 'ready', rows: [{ ...metricRow('responseTime', '12'), unit: 'ms', collectedAt: 0 }] },
      selectedHistoryChart: historyChart('summary.responseTime', { kind: 'loading', rows: [] })
    });
    renderWorkbench(value);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: i18n.t('monitorMetrics.allMetricCount', { count: 2 }) })).toBeChecked();
    expect(document.querySelector('[data-monitor-history-tray]')).toHaveAttribute(
      'data-history-metric',
      'summary.responseTime'
    );
    expect(document.querySelector('[data-monitor-history-tray]')).toHaveTextContent('Current: 12');

    fireEvent.click(screen.getByRole('button', { name: 'summary.responseTime' }));
    expect(value.actions.setMetric).toHaveBeenCalledWith('summary.responseTime');
    expect(value.actions.activateHistoryChart).toHaveBeenCalledWith('summary.responseTime');

    const row = document.querySelector('[data-monitor-metric="summary.responseTime"]')!;
    expect(within(row as HTMLElement).queryByRole('button', { name: i18n.t('monitorMetrics.unfavorite') })).toBeNull();
    expect(within(row as HTMLElement).queryByRole('button', { name: i18n.t('monitorMetrics.favorite') })).toBeNull();
    expect(
      within(document.querySelector('[data-monitor-history-tray]') as HTMLElement).queryByRole('button', {
        name: i18n.t('monitorMetrics.unfavorite')
      })
    ).toBeNull();
    expect(screen.getAllByRole('button', { name: i18n.t('monitorMetrics.unfavorite') })).toHaveLength(1);
  });

  it('renders one realtime sample as a dense field/value table without field-level favorites', () => {
    const value = controller({
      catalog: {
        kind: 'ready',
        options: [
          { key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' },
          { key: 'summary.status', group: 'summary', field: 'status' }
        ]
      },
      realtimeGroups: [
        {
          ...realtimeGroup('summary'),
          result: {
            kind: 'ready',
            rows: [
              { ...metricRow('responseTime', '12'), unit: 'ms', collectedAt: 0 },
              { ...metricRow('status', 'UP'), collectedAt: 0 },
              metricRow('message', '—')
            ]
          }
        }
      ]
    });
    renderWorkbench(value);

    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    const responseTimeRow = document.querySelector('[data-monitor-metric="summary.responseTime"]')!;
    expect(within(responseTimeRow as HTMLElement).getByText('ms')).toBeInTheDocument();
    expect(within(responseTimeRow as HTMLElement).getByText('12')).toBeInTheDocument();
    expect(screen.getByText(new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(0))).toBeInTheDocument();
    expect(
      within(responseTimeRow as HTMLElement).queryByRole('button', { name: i18n.t('monitorMetrics.favorite') })
    ).toBeNull();
  });

  it('reserves the compact table width for metric identities and values only', () => {
    renderWorkbench(controller());

    const columns = screen.getByRole('table', { name: i18n.t('monitorMetrics.currentValues') }).querySelectorAll('col');
    expect(columns).toHaveLength(2);
    expect(columns[0]).toHaveAttribute('data-metric-column', 'identity');
    expect(document.querySelector('[data-metric-column="favorite"]')).toBeNull();
  });

  it('preserves the multi-sample label and field matrix', () => {
    renderWorkbench(
      controller({
        realtimeGroups: [
          {
            ...realtimeGroup('summary'),
            result: {
              kind: 'ready',
              rows: [
                { ...metricRow('qps', '10'), labels: { host: 'a' }, time: 1000 },
                { ...metricRow('threads', '2'), labels: { host: 'a' }, time: 1000 },
                { ...metricRow('qps', '11'), key: '1:qps', labels: { host: 'b' }, time: 2000 },
                { ...metricRow('threads', '3'), key: '1:threads', labels: { host: 'b' }, time: 2000 }
              ]
            }
          }
        ]
      })
    );

    expect(screen.getByRole('columnheader', { name: 'host' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'qps' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'threads' })).toBeInTheDocument();
    expect(within(screen.getByText('b').closest('tr')!).getByText('3')).toBeInTheDocument();
  });

  it('filters favorites, search, and groups through the single dashboard toolbar', () => {
    const value = controller({
      catalog: {
        kind: 'ready',
        options: [
          { key: 'summary.responseTime', group: 'summary', field: 'responseTime' },
          { key: 'availability.status', group: 'availability', field: 'status' }
        ]
      },
      favoriteCollection: { kind: 'ready', items: [{ key: 'summary', available: true }] },
      realtimeGroupNames: ['summary', 'availability'],
      realtimeGroups: [
        {
          ...realtimeGroup('summary'),
          favorite: { kind: 'ready', value: true, token: 'summary' },
          result: { kind: 'ready', rows: [metricRow('responseTime', '12')] }
        },
        { ...realtimeGroup('availability'), result: { kind: 'ready', rows: [metricRow('status', 'UP')] } }
      ]
    });
    renderWorkbench(value);

    fireEvent.click(screen.getByRole('radio', { name: /Favorites 1/ }));
    expect(screen.getByRole('heading', { name: 'summary' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'availability' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: i18n.t('monitorMetrics.allMetricCount', { count: 2 }) }));
    fireEvent.change(screen.getByRole('searchbox', { name: i18n.t('monitorMetrics.search') }), {
      target: { value: 'status' }
    });
    expect(screen.queryByRole('heading', { name: 'summary' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'availability' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: i18n.t('monitorMetrics.search') }), {
      target: { value: '' }
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: i18n.t('monitorMetrics.groupFilter') }));
    fireEvent.click(
      screen.getAllByText('summary').find(element => element.classList.contains('ant-select-item-option-content'))!
    );
    expect(screen.getByRole('heading', { name: 'summary' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'availability' })).not.toBeInTheDocument();
  });

  it('uses the same two-way segmented control for metric view and history value mode', () => {
    renderWorkbench(controller({ selectedHistoryChart: historyChart('summary.value', { kind: 'loading', rows: [] }) }));

    expect(screen.getByRole('radiogroup', { name: i18n.t('monitorMetrics.metricView') })).toHaveClass('ant-segmented');
    expect(screen.getByRole('radiogroup', { name: i18n.t('monitorMetrics.historyMode') })).toHaveClass('ant-segmented');
  });

  it('loads the next realtime group batch when the fallback control enters the viewport', () => {
    let notifyIntersection: IntersectionObserverCallback | undefined;
    const observeMock = vi.fn();
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = callback;
      }
      observe = observeMock;
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn();
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const value = controller({ hasMoreRealtimeGroups: true });

    renderWorkbench(value);
    const loadMore = screen.getByRole('button', { name: i18n.t('monitorMetrics.loadMore') });
    expect(observeMock).toHaveBeenCalledWith(loadMore);
    act(() =>
      notifyIntersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    );
    expect(value.actions.loadMoreRealtimeGroups).toHaveBeenCalledOnce();
  });

  it('does not promote a legacy field token to a whole-group favorite', () => {
    const value = controller({
      favoriteCollection: { kind: 'ready', items: [{ key: 'summary.value', available: false }] },
      realtimeGroups: [realtimeGroup('summary')]
    });
    renderWorkbench(value);

    expect(screen.getByRole('radio', { name: /Favorites 0/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Favorites 0/ }));
    expect(screen.queryByRole('heading', { name: 'summary' })).not.toBeInTheDocument();
    expect(screen.getByText(i18n.t('monitorMetrics.favoriteEmpty'))).toBeInTheDocument();
  });

  it('lets panel height own dense scrolling without a second expand surface', () => {
    const rows = Array.from({ length: 8 }, (_, index) => metricRow(`metric_${index + 1}`, String(index + 1)));
    const value = controller({
      catalog: {
        kind: 'ready',
        options: rows.map(row => ({ key: `summary.${row.field}`, group: 'summary', field: row.field }))
      },
      metricKey: 'summary.metric_8',
      favoriteCollection: { kind: 'ready', items: [{ key: 'summary.metric_8', available: false }] },
      realtimeGroups: [
        {
          ...realtimeGroup('summary'),
          result: { kind: 'ready', rows }
        }
      ]
    });
    renderWorkbench(value);

    const card = screen.getByRole('article');
    expect(within(card).getAllByRole('row')).toHaveLength(8);
    expect(within(card).getByRole('button', { name: 'summary.metric_7' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'summary.metric_8' })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /Expand metric group/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description'],
    ['empty', 'monitorMetrics.empty']
  ] as const)('renders distinct realtime group %s evidence', (kind, key) => {
    renderWorkbench(controller({ realtimeGroups: [{ ...realtimeGroup('summary'), result: { kind, rows: [] } }] }));
    expect(screen.getByText(i18n.t(key))).toBeInTheDocument();
  });

  it.each(catalogCases)('renders distinct catalog evidence %#', (catalog, key) => {
    renderWorkbench(controller({ catalog, realtimeGroups: [] }));
    expect(screen.getByText(i18n.t(key)).closest('[data-state]')).toBeInTheDocument();
  });

  it('fails the selected history tray closed when storage is unavailable', () => {
    renderWorkbench(
      controller({
        selectedHistoryChart: historyChart('summary.value', { kind: 'loading', rows: [] }),
        historyAvailability: { kind: 'unavailable' }
      })
    );

    expect(screen.getByText(i18n.t('common.unavailable')).closest('[data-state]')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'summary.value' })).not.toBeInTheDocument();
  });

  it('controls exact history ranges, raw/aggregate mode, and refresh from an in-flow panel', () => {
    const value = controller({ selectedHistoryChart: historyChart('summary.value', { kind: 'loading', rows: [] }) });
    renderWorkbench(value);

    const range = screen.getByRole('combobox', { name: i18n.t('monitorMetrics.historyRange') });
    fireEvent.mouseDown(range);
    fireEvent.click(screen.getByText('4W'));
    expect(value.actions.setHistoryChartRange).toHaveBeenCalledWith('summary.value', '4W');

    fireEvent.click(screen.getByRole('radio', { name: i18n.t('monitorMetrics.aggregatedValues') }));
    expect(value.actions.setHistoryChartMode).toHaveBeenCalledWith('summary.value', true);
    expect(value.actions.setHistoryChartRange).not.toHaveBeenCalledWith('summary.value', '1W');
    fireEvent.click(
      within(document.querySelector('[data-monitor-history-tray]') as HTMLElement).getByRole('button', {
        name: i18n.t('monitorMetrics.refreshHistory')
      })
    );
    expect(value.actions.refreshHistoryChart).toHaveBeenCalledWith('summary.value');
    expect(screen.queryByRole('button', { name: i18n.t('monitorMetrics.collapseHistory') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitorMetrics.expandHistory') })).not.toBeInTheDocument();
  });

  it('integrates layout editing into the dashboard command bar and places history before realtime panels', () => {
    renderWorkbench(controller({ selectedHistoryChart: historyChart('summary.value', { kind: 'loading', rows: [] }) }));

    const commandBar = document.querySelector('[data-hb-operational-command-bar]') as HTMLElement;
    const history = document.querySelector('[data-monitor-history-tray]') as HTMLElement;
    const realtime = screen.getByRole('article');

    expect(within(commandBar).getByRole('button', { name: i18n.t('monitorMetrics.layout.edit') })).toBeVisible();
    expect(history.compareDocumentPosition(realtime) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'summary' })).not.toBeInTheDocument();
  });

  it('pauses and resumes shared live refresh without hiding current values', () => {
    const value = controller();
    const rendered = renderWorkbench(value);

    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitorMetrics.pause') }));
    expect(value.actions.setRefreshSeconds).toHaveBeenCalledWith(0);
    rendered.rerender(workbenchNode(controller({ refreshSeconds: 0 })));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitorMetrics.returnLive') }));
    expect(screen.getByRole('heading', { name: 'summary' })).toBeInTheDocument();
  });

  it.each([
    [{ kind: 'unavailable' as const }, 'common.unavailable'],
    [{ kind: 'error' as const }, 'common.routeError.description'],
    [{ kind: 'empty' as const, items: [] }, 'monitorMetrics.favoriteEmpty']
  ])('renders distinct favorites evidence %#', (favoriteCollection, key) => {
    renderWorkbench(controller({ favoriteCollection }));
    fireEvent.click(screen.getByRole('radio', { name: /Favorites/ }));
    expect(screen.getAllByText(i18n.t(key)).length).toBeGreaterThan(0);
  });
});

function controller(
  statePatch: Partial<MonitorMetricWorkbenchController['state']> = {}
): MonitorMetricWorkbenchController {
  return {
    state: {
      catalog: { kind: 'ready', options: [{ key: 'summary.value', group: 'summary', field: 'value' }] },
      metricKey: 'summary.value',
      history: '30m',
      historySupported: true,
      refreshSeconds: 90,
      favorite: { kind: 'ready', value: false },
      favoriteCollection: { kind: 'empty', items: [] },
      favoriteBusy: false,
      realtimeGroupNames: ['summary'],
      realtimeGroups: [realtimeGroup('summary')],
      hasMoreRealtimeGroups: false,
      historyAvailability: { kind: 'available' },
      historyCharts: [],
      hasMoreHistoryCharts: false,
      realtime: { kind: 'ready', rows: [metricRow('value', '12')] },
      historical: { kind: 'empty', rows: [] },
      layout: {
        readState: 'ready',
        editing: false,
        saving: false,
        revision: '',
        hasSavedLayout: false,
        layout: {
          schemaVersion: 1,
          mode: 'auto',
          columns: 12,
          items: [{ group: 'summary', x: 0, y: 0, w: 4, h: 10, collapsed: false, order: 0 }],
          historyDock: { collapsed: false, height: 12 }
        }
      },
      ...statePatch
    },
    actions: {
      setMetric: vi.fn(),
      setHistory: vi.fn(),
      setRefreshSeconds: vi.fn(),
      toggleFavorite: vi.fn(),
      toggleRealtimeFavorite: vi.fn(),
      revealRealtimeGroup: vi.fn(),
      loadMoreRealtimeGroups: vi.fn(),
      activateHistoryChart: vi.fn(),
      setHistoryChartRange: vi.fn(),
      setHistoryChartMode: vi.fn(),
      refreshHistoryChart: vi.fn(),
      loadMoreHistoryCharts: vi.fn(),
      refresh: vi.fn(),
      layout: {
        beginEdit: vi.fn(),
        cancelEdit: vi.fn(),
        changeItems: vi.fn(),
        changeHistoryDock: vi.fn(),
        save: vi.fn(),
        reset: vi.fn()
      }
    }
  };
}

function metricRow(field: string, value: string) {
  return { key: `0:${field}`, labels: {}, field, unit: null, value, time: null, collectedAt: null };
}

function realtimeGroup(group: string): MonitorMetricWorkbenchController['state']['realtimeGroups'][number] {
  return {
    group,
    favorite: { kind: 'ready', value: false },
    favoriteBusy: false,
    result: { kind: 'ready', rows: [metricRow('value', '12')] }
  };
}

function historyChart(
  key: string,
  result: MonitorMetricWorkbenchController['state']['historyCharts'][number]['result']
): MonitorMetricWorkbenchController['state']['historyCharts'][number] {
  const [group, field] = key.split('.');
  return { metric: { key, group: group!, field: field! }, history: '30m', interval: false, result };
}

function workbenchNode(value: MonitorMetricWorkbenchController) {
  return (
    <I18nextProvider i18n={i18n}>
      <MonitorMetricWorkbench {...value} />
    </I18nextProvider>
  );
}

function renderWorkbench(value: MonitorMetricWorkbenchController) {
  return render(workbenchNode(value));
}
