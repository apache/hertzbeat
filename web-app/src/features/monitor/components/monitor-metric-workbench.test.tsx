/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type {
  MonitorMetricCatalogEvidence,
  MonitorMetricFavoriteCollectionEvidence,
  MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import { MonitorMetricWorkbench } from './monitor-metric-workbench';

const catalogCases: Array<[MonitorMetricCatalogEvidence, string]> = [
  [{ kind: 'fallback', options: [], references: ['summary'] }, 'common.unavailable'],
  [{ kind: 'unavailable', options: [] }, 'common.unavailable'],
  [{ kind: 'error', options: [] }, 'common.routeError.description'],
  [{ kind: 'empty', options: [] }, 'monitorMetrics.noCatalog']
];
const favoriteCollectionCases: Array<[MonitorMetricFavoriteCollectionEvidence, string]> = [
  [{ kind: 'unavailable' }, 'common.unavailable'],
  [{ kind: 'error' }, 'common.routeError.description'],
  [{ kind: 'empty', items: [] }, 'monitorMetrics.favoriteEmpty']
];

describe('MonitorMetricWorkbench', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('renders the selected realtime field and preserves epoch zero', () => {
    renderWorkbench(
      controller({
        realtime: {
          kind: 'ready',
          rows: [
            {
              key: '0',
              labels: { host: 'a' },
              value: '12',
              time: 0
            }
          ]
        }
      })
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(
      screen.getByText(new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(0))
    ).toBeInTheDocument();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description'],
    ['empty', 'monitorMetrics.empty']
  ] as const)('renders distinct realtime %s evidence', (kind, key) => {
    renderWorkbench(controller({ realtime: { kind, rows: [] } }));
    expect(screen.getByText(i18n.t(key))).toBeInTheDocument();
  });

  it.each(catalogCases)('renders distinct catalog evidence %#', (catalog, key) => {
    renderWorkbench(controller({ catalog }));
    expect(screen.getByText(i18n.t(key))).toBeInTheDocument();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ] as const)('renders favorite %s as unknown evidence', (kind, key) => {
    renderWorkbench(controller({ favorite: { kind } }));
    expect(screen.getAllByText(i18n.t(key)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: i18n.t('monitorMetrics.favorite') })).toBeDisabled();
  });

  it('keeps favorite unavailable to interaction while canonical verification is pending', () => {
    renderWorkbench(controller({ favoriteBusy: true }));

    expect(screen.getByText(i18n.t('monitorMetrics.favorite')).closest('button')).toBeDisabled();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description'],
    ['empty', 'monitorMetrics.empty']
  ] as const)('renders distinct history %s evidence', (kind, key) => {
    renderWorkbench(controller({ historical: { kind, rows: [] } }));
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('monitorMetrics.history') }));
    expect(screen.getAllByText(i18n.t(key)).length).toBeGreaterThan(0);
  });

  it('shows the auto-refresh choices and forwards an Off selection', () => {
    const value = controller();
    renderWorkbench(value);

    const refreshSelect = screen.getByRole('combobox', { name: i18n.t('monitorMetrics.autoRefresh.label') });
    expect(refreshSelect.closest('.ant-select')).toHaveTextContent(
      i18n.t('monitorMetrics.autoRefresh.seconds', { count: 90 })
    );
    fireEvent.mouseDown(refreshSelect);
    fireEvent.click(screen.getByText(i18n.t('monitorMetrics.autoRefresh.off')));

    expect(value.actions.setRefreshSeconds).toHaveBeenCalledWith(0);
  });

  it('makes the favorite collection discoverable and selects only available favorite metrics', () => {
    const value = controller({
      favoriteCollection: {
        kind: 'ready',
        items: [
          { key: 'retired.value', available: false },
          { key: 'summary.value', available: true }
        ]
      }
    });
    renderWorkbench(value);

    fireEvent.click(screen.getByRole('tab', { name: i18n.t('monitorMetrics.favorites') }));
    expect(screen.getByRole('button', { name: 'retired.value' })).toBeDisabled();
    expect(screen.getByText(i18n.t('monitorMetrics.favoriteUnavailable'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'summary.value' }));

    expect(value.actions.setMetric).toHaveBeenCalledWith('summary.value');
    expect(screen.getAllByRole('tab', { name: i18n.t('monitorMetrics.realtime') })).toHaveLength(2);
    expect(screen.getAllByRole('tab', { name: i18n.t('monitorMetrics.history') })).toHaveLength(2);
  });

  it.each(favoriteCollectionCases)('renders distinct favorite collection %# evidence', (favoriteCollection, key) => {
    renderWorkbench(controller({ favoriteCollection }));

    fireEvent.click(screen.getByRole('tab', { name: i18n.t('monitorMetrics.favorites') }));
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
      refreshSeconds: 90,
      favorite: { kind: 'ready', value: false },
      favoriteCollection: { kind: 'empty', items: [] },
      favoriteBusy: false,
      realtime: { kind: 'empty', rows: [] },
      historical: { kind: 'empty', rows: [] },
      ...statePatch
    },
    actions: {
      setMetric: vi.fn(),
      setHistory: vi.fn(),
      setRefreshSeconds: vi.fn(),
      toggleFavorite: vi.fn(),
      refresh: vi.fn()
    }
  };
}

function renderWorkbench(value: MonitorMetricWorkbenchController) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MonitorMetricWorkbench {...value} />
    </I18nextProvider>
  );
}
