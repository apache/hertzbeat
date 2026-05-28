import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('./monitor-history-panel', () => ({
  MonitorHistoryPanel: () => <div>history-panel</div>
}));

vi.mock('./monitor-realtime-panel', () => ({
  MonitorRealtimePanel: ({ compact }: { compact?: boolean }) => (
    <div
      data-monitor-realtime-compact={compact ? 'true' : 'false'}
      data-monitor-surface-compact-layout={compact ? 'cardless-table' : undefined}
      data-monitor-realtime-wrapper={compact ? 'monitor-data-table' : undefined}
      data-monitor-realtime-action-band={compact ? 'monitor-data-table' : undefined}
      data-monitor-realtime-action-group={compact ? 'metrics-card-extra' : undefined}
      data-monitor-realtime-collect-time={compact ? 'true' : undefined}
    >
      realtime-panel
    </div>
  )
}));

vi.mock('./monitor-summary-card', () => ({
  MonitorSummaryCard: () => <div>summary-card</div>
}));

vi.mock('../ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>
}));

vi.mock('../ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../ui/input', () => ({
  Input: () => <input />
}));

vi.mock('../workbench/workbench-page', () => ({
  RowList: ({ rows }: { rows: Array<{ title: string }> }) => <div>{rows.map(row => row.title).join(',')}</div>
}));

const t = createTranslatorMock();

describe('monitor detail sections', () => {
  it('does not render a full-width realtime loading stage above metric cards', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');
    const signalListSource = source.slice(
      source.indexOf('function MetricSignalList'),
      source.indexOf('function MonitorBasicSharedSurface')
    );
    const realtimeStart = source.indexOf('const realtimeNode = (');
    const historyStart = source.indexOf('const historyNode = (', realtimeStart);
    const realtimeSource = source.slice(realtimeStart, historyStart);

    expect(realtimeSource).toContain('<MetricSignalList');
    expect(signalListSource).toContain('data-monitor-detail-realtime-payload-errors="card-local"');
    expect(realtimeSource).not.toContain('data-monitor-detail-state-owner="hertzbeat-ui-loading-state"');
    expect(realtimeSource).not.toContain('metricPayloadLoading ?');
    expect(realtimeSource).not.toContain('metricPayloadError ?');
    expect(realtimeSource).not.toContain('data-monitor-detail-state-scope="realtime"');
    expect(realtimeSource).not.toContain('<HzLoadingState');
  });

  it('builds all five section outputs through the named consumer', async () => {
    const { MonitorDetailSections } = await import('./monitor-detail-sections');
    const sections = MonitorDetailSections({
      monitor: {
        id: 42,
        name: 'checkout-core',
        app: 'http',
        status: 1,
        instance: '10.0.0.1'
      } as any,
      editHref: '/monitors/42/edit?app=http',
      params: [],
      selectedMetric: null,
      metricSearch: '',
      metricRows: [
        { key: 'summary', title: 'summary', copy: '0', meta: 'fields' },
        { key: 'header', title: 'header', copy: '0', meta: 'fields' }
      ],
      realtimeMetricTotalCount: 4,
      realtimeMetricHasMore: true,
      metricCardPayloads: {
        summary: {
          loading: false,
          error: null,
          payload: {
            fields: [{ name: 'response_time', unit: 'ms' }],
            valueRows: [{ labels: { instance: '10.0.0.1' }, values: [{ origin: '42' }] }]
          }
        },
        header: {
          loading: false,
          error: null,
          payload: {
            fields: [{ name: 'status' }],
            valueRows: [{ labels: { instance: '10.0.0.1' }, values: [{ origin: 'UP' }] }]
          }
        }
      },
      metrics: [{ name: 'summary' }, { name: 'header' }] as any,
      favoriteNames: ['summary'],
      favoriteJumpRows: [
        {
          key: 'realtime:summary',
          title: 'summary',
          copy: 'Favorite realtime metric',
          meta: 'realtime',
          targetKey: 'summary',
          targetKind: 'realtime',
          favoriteToken: 'summary'
        },
        {
          key: 'history:cpu.usage',
          title: 'cpu.usage',
          copy: '%',
          meta: 'history',
          targetKey: 'cpu:usage',
          targetKind: 'history',
          favoriteToken: 'cpu.usage'
        }
      ],
      selectedFavoriteKey: 'realtime:summary',
      favoriteSurfaceMode: 'realtime',
      favoriteRealtimeMetricVisibleCount: 1,
      favoriteRealtimeMetricTotalCount: 2,
      favoriteRealtimeMetricHasMore: true,
      selectedMetricKey: 'summary',
      metricPayload: null,
      metricPayloadLoading: false,
      metricPayloadError: null,
      selectedMetricRowKey: null,
      metricTableMode: 'table',
      metricFullscreen: false,
      historyLoading: false,
      historyError: null,
      historyMetrics: [
        { metrics: 'cpu', metric: 'usage', unit: '%' },
        { metrics: 'memory', metric: 'used', unit: 'MB' }
      ],
      historyMetricSearch: '',
      historyRows: [
        { key: 'cpu:usage', title: 'cpu.usage', copy: '%', meta: 'history' },
        { key: 'memory:used', title: 'memory.used', copy: 'MB', meta: 'history' }
      ],
      historyChartVisibleCount: 2,
      historyChartTotalCount: 4,
      historyChartHasMore: true,
      selectedHistoryMetricKey: 'cpu:usage',
      historySeriesSearch: '',
      historySeriesRows: [],
      selectedHistorySeriesKey: null,
      selectedHistoryPointIndex: null,
      historyPayload: {
        values: {
          origin: [
            { time: 1710000000000, origin: 41 },
            { time: 1710000060000, origin: 45 }
          ]
        }
      } as any,
      historyChartPayloads: {
        'cpu:usage': {
          values: {
            '': [
              { time: 1710000000000, origin: 41 },
              { time: 1710000060000, origin: 45 }
            ]
          }
        },
        'memory:used': {
          values: {
            '': [
              { time: 1710000000000, origin: 128 },
              { time: 1710000060000, origin: 132 }
            ]
          }
        }
      } as any,
      historyChartLoadingKeys: [],
      historyChartErrors: {},
      historyPayloadLoading: false,
      historyPayloadError: null,
      historyInterval: false,
      historyWindow: '1h',
      historyWindows: [{ value: '1h', label: '1h' }],
      historyModes: [{ value: false, label: 'Raw' }],
      historyFullscreen: false,
      favoriteHistoryChartVisibleCount: 1,
      favoriteHistoryChartTotalCount: 2,
      favoriteHistoryChartHasMore: true,
      grafanaState: { enabled: true, url: 'https://grafana.example/d/monitor' },
      grafanaMessage: 'Dashboard deleted',
      grafanaError: null,
      favoriteMessage: null,
      favoriteError: null,
      onMetricSearchChange: () => {},
      onSelectMetric: () => {},
      onToggleFavorite: () => {},
      onLoadMoreRealtimeMetrics: () => {},
      onSelectMetricRow: () => {},
      onMetricModeChange: () => {},
      onMetricRefresh: () => {},
      onMetricFullscreenToggle: () => {},
      onHistoryMetricSearchChange: () => {},
      onSelectHistoryMetric: () => {},
      onToggleHistoryFavorite: () => {},
      onHistorySeriesSearchChange: () => {},
      onSelectHistorySeries: () => {},
      onSelectHistoryPoint: () => {},
      onHistoryRefresh: () => {},
      onFavoriteHistoryRefresh: () => {},
      onLoadMoreHistoryCharts: () => {},
      onHistoryWindowChange: () => {},
      onHistoryModeChange: () => {},
      onHistoryFullscreenToggle: () => {},
      onSelectFavorite: () => {},
      onSetFavoriteSurfaceMode: () => {},
      onLoadMoreFavoriteRealtimeMetrics: () => {},
      onLoadMoreFavoriteHistoryCharts: () => {},
      onRemoveFavoriteToken: () => {},
      onDeleteGrafanaDashboard: () => {},
      t
    });

    expect(Object.keys(sections)).toEqual([
      'contextContent',
      'realtimeContent',
      'historyContent',
      'favoritesContent',
      'grafanaContent'
    ]);

    const contextHtml = renderToStaticMarkup(<>{sections.contextContent}</>);
    const realtimeHtml = renderToStaticMarkup(<>{sections.realtimeContent}</>);
    const historyHtml = renderToStaticMarkup(<>{sections.historyContent}</>);
    const favoritesHtml = renderToStaticMarkup(<>{sections.favoritesContent}</>);
    const grafanaHtml = renderToStaticMarkup(<>{sections.grafanaContent}</>);

    expect(contextHtml).toBe('');
    expect(contextHtml).not.toContain('Pinned evidence');
    expect(realtimeHtml).not.toContain('Monitor Observation');
    expect(realtimeHtml).toContain('Monitoring Basic');
    expect(realtimeHtml).not.toContain('This card shows the base observation details and latest status for monitor instance 10.0.0.1.');
    expect(realtimeHtml).not.toContain('HertzBeat Collection');
    expect(realtimeHtml).toContain('data-hz-ui="monitor-basic-card"');
    expect(realtimeHtml).toContain('data-monitor-basic-owner="hertzbeat-ui-basic-card"');
    expect(realtimeHtml).toContain('data-monitor-basic-edit-action="hertzbeat-ui-icon-action"');
    expect(realtimeHtml).toContain('href="/monitors/42/edit?app=http"');
    expect(realtimeHtml).toContain('aria-label="Edit monitor"');
    expect(realtimeHtml).toContain('summary-card');
    expect(realtimeHtml).toContain('data-hz-ui="monitor-metric-card-grid"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-flow="shared-metric-card-grid"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-realtime-card-flow="angular-cards-list"');
    expect(realtimeHtml).toContain('data-hz-ui="workbench-surface"');
    expect(realtimeHtml).toContain('data-hz-workbench-surface-selected="false"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-grid="basic-and-metrics"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-reference="hertzbeat-ui-monitor-card-grid"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-height="content-driven"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-chrome="hertzbeat-ui-card-grid"');
    expect(realtimeHtml).toContain('data-hz-ui="monitor-incremental-load-footer"');
    expect(realtimeHtml).toContain('data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"');
    expect(realtimeHtml).toContain('data-monitor-detail-incremental-mode="angular-sentinel"');
    expect(realtimeHtml).toContain('data-monitor-detail-incremental-scope="realtime"');
    expect(realtimeHtml).toContain('data-hz-monitor-incremental-sentinel="true"');
    expect(realtimeHtml).toContain('data-hz-monitor-incremental-action="load-more"');
    expect(realtimeHtml).toContain('data-monitor-basic-grid-item="shared-first-card"');
    expect(realtimeHtml.indexOf('data-monitor-basic-grid-item="shared-first-card"')).toBeLessThan(
      realtimeHtml.indexOf('data-monitor-detail-signal-row="summary"')
    );
    expect(realtimeHtml.indexOf('data-monitor-detail-signal-row="summary"')).toBeLessThan(
      realtimeHtml.indexOf('data-monitor-detail-signal-row="header"')
    );
    expect(realtimeHtml).toContain('data-monitor-basic-stage-surface="hertzbeat-ui-basic-card"');
    expect(realtimeHtml).toContain('data-monitor-basic-card-chrome="hertzbeat-ui-basic-card"');
    expect(realtimeHtml).toContain('data-monitor-basic-card-tone="neutral-graphite"');
    expect(realtimeHtml).toContain('bg-[var(--hz-ui-surface-graphite)]');
    const basicCardStart = realtimeHtml.indexOf('data-monitor-basic-stage-surface="hertzbeat-ui-basic-card"');
    const basicCardEnd = realtimeHtml.indexOf('data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"', basicCardStart);
    const basicCardHtml = realtimeHtml.slice(basicCardStart, basicCardEnd);
    expect(basicCardHtml).not.toContain('bg-[var(--hz-ui-surface-raised)]');
    expect(basicCardHtml).not.toContain('bg-[var(--hz-ui-active)]');
    expect(realtimeHtml).not.toContain('data-monitor-basic-card-chrome="angular-card-box"');
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-surface[^\"]*monitor-workbench-surface--plain/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card[^\"]*monitor-detail-card--overview/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-surface__edit/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-surface__header/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-card-title__copy/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-card-title__title/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-card-title__kicker/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-card-title__summary/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-workbench-card-title__badge/);
    expect(realtimeHtml).not.toContain('data-monitor-basic-source-badge-density="plain-meta"');
    expect(realtimeHtml).not.toContain('data-monitor-realtime-compact="true"');
    expect(realtimeHtml).not.toContain('data-monitor-surface-compact-layout="cardless-table"');
    expect(realtimeHtml).not.toContain('data-monitor-realtime-wrapper="monitor-data-table"');
    expect(realtimeHtml).not.toContain('data-monitor-realtime-action-band="monitor-data-table"');
    expect(realtimeHtml).not.toContain('data-monitor-realtime-action-group="metrics-card-extra"');
    expect(realtimeHtml).not.toContain('data-monitor-realtime-collect-time="true"');
    expect(realtimeHtml).toContain('data-hz-ui="monitor-detail-tab-sequence"');
    expect(realtimeHtml).toContain('data-monitor-detail-tab-sequence-owner="hertzbeat-ui-detail-tab-sequence"');
    expect(realtimeHtml).toContain('data-monitor-detail-tab-sequence="shared-tight"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-tab-sequence="angular-tight"');
    const sharedTabSequenceClassMatch = realtimeHtml.match(/data-monitor-detail-tab-sequence-owner="hertzbeat-ui-detail-tab-sequence"[^>]*class="([^"]+)"/);
    expect(sharedTabSequenceClassMatch?.[1]).not.toContain('monitor-detail-tab-sequence');
    expect(realtimeHtml).toContain('data-hz-ui="monitor-detail-stage"');
    expect(realtimeHtml).toContain('data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"');
    expect(realtimeHtml).toContain('data-monitor-detail-stage-rhythm="shared-tight"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-list-rhythm="shared-tight"');
    expect(realtimeHtml).toContain('data-monitor-detail-card-grid-rhythm="shared-tight"');
    expect(realtimeHtml).not.toContain('monitor-detail-tab-sequence--angular-tight');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-summary-strip="monitor-data-table"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-panel-summary-rhythm="angular-chip-row"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-panel-summary-density="angular-pill-toolbar"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-panel-summary-item="total"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-panel-summary-item="visible"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-panel-summary-item="source"');
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-panel-strip/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*platform-facts-strip/);
    expect(realtimeHtml).not.toContain('Total');
    expect(realtimeHtml).not.toContain('Visible');
    expect(realtimeHtml).not.toContain('Source');
    expect(realtimeHtml).toContain('data-monitor-detail-stage-header="hidden"');
    expect(realtimeHtml).not.toContain('Inspect realtime metric rows and selection state.');
    expect(realtimeHtml).not.toContain('Review real-time metrics, historical trends, and favorites around monitor instance 10.0.0.1 with the same observation workbench language.');
    expect(realtimeHtml).not.toContain('Realtime stage');
    expect(realtimeHtml).not.toContain('Inspect the latest metric rows and row details.');
    expect(realtimeHtml).toContain('data-monitor-detail-flat-stage="true"');
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-stage[^\"]*monitor-detail-stage--overview/);
    expect(realtimeHtml).not.toContain('data-observability-panel-tone="operator-sheet"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-list="true"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-grid="monitor-data-table"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-list-geometry="shared-two-column-metric-cards"');
    expect(realtimeHtml).toContain('data-hz-ui="monitor-metric-card"');
    expect(realtimeHtml).toContain('data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-row-density="shared-metric-card"');
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card-grid/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-signal-card-grid/);
    const sharedGridClassMatch = realtimeHtml.match(/data-monitor-detail-card-grid-rhythm="shared-tight"[^>]*class="([^"]+)"/);
    expect(sharedGridClassMatch?.[1]).toEqual(expect.stringContaining('grid'));
    expect(sharedGridClassMatch?.[1]).toEqual(expect.stringContaining('grid-cols-1'));
    expect(sharedGridClassMatch?.[1]).toEqual(expect.stringContaining('gap-2'));
    expect(sharedGridClassMatch?.[1]).toEqual(expect.stringContaining('lg:grid-cols-2'));
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-signal-card-stack/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-signal-table[^\"]*divide-y/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card[^\"]*monitor-detail-card--signal-flat/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card--signal-metric/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card--signal-row/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card--signal-card-row/);
    expect(realtimeHtml).not.toContain('monitor-realtime-data-table');
    const sharedMetricClassMatch = realtimeHtml.match(/data-monitor-detail-metric-card-tone="neutral-graphite" class="([^"]+)"/);
    expect(sharedMetricClassMatch?.[1]).toEqual(expect.stringContaining('grid'));
    expect(sharedMetricClassMatch?.[1]).toEqual(expect.stringContaining('min-h-[400px]'));
    expect(sharedMetricClassMatch?.[1]).toEqual(expect.stringContaining('content-start'));
    expect(sharedMetricClassMatch?.[1]).toEqual(expect.stringContaining('gap-3'));
    expect(sharedMetricClassMatch?.[1]).toEqual(expect.stringContaining('rounded-[3px]'));
    expect(sharedMetricClassMatch?.[1]).toEqual(expect.stringContaining('border'));
    expect(sharedMetricClassMatch?.[1]).toEqual(expect.stringContaining('p-3'));
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-stage/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-stage--signals/);
    expect(realtimeHtml).toContain('data-monitor-detail-signal-row="summary"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card="true"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card-chrome="hertzbeat-ui-metric-card"');
    expect(realtimeHtml).toContain('data-monitor-detail-metric-card-tone="neutral-graphite"');
    expect(realtimeHtml).toContain('bg-[var(--hz-ui-surface-graphite)]');
    const metricCardStart = realtimeHtml.indexOf('data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"');
    const metricCardHtml = realtimeHtml.slice(metricCardStart);
    expect(metricCardHtml).not.toContain('bg-[var(--hz-ui-surface-raised)]');
    expect(metricCardHtml).not.toContain('bg-[var(--hz-ui-active-soft)]');
    expect(realtimeHtml).not.toContain('data-selected=');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card-table="true"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card-body-density="shared-metric-table"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-selected-style="left-rail"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-selected-style="angular-neutral"');
    expect(realtimeHtml).toContain('data-hz-monitor-metric-table-row="metric-fields"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-row-title="true"');
    expect(realtimeHtml).not.toMatch(/>\s*\d+\s+(?:Fields|字段)\s*</);
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-card-table-row="source"');
    expect(realtimeHtml).not.toContain('Real-time Metric');
    expect(realtimeHtml).not.toContain('This card shows the latest sampled result for summary while keeping the native HertzBeat collection semantics.');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-header-actions="plain-meta"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-source-badge="true"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-source-density="plain-meta"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-row-action="favorite"');
    expect(realtimeHtml).toContain('data-hz-ui="monitor-metric-favorite-action"');
    expect(realtimeHtml).toContain('aria-label="Add favorite"');
    expect(realtimeHtml).toContain('aria-label="Remove favorite"');
    expect(realtimeHtml).not.toContain('bg-[var(--ops-surface-elevated)]');
    expect(realtimeHtml).not.toContain('border-[var(--ops-primary)]');
    expect(realtimeHtml).not.toContain('shadow-[inset_2px_0_0_var(--ops-primary)]');
    expect(realtimeHtml).not.toContain('shadow-[inset_2px_0_0_0_var(--ops-primary)]');
    expect(realtimeHtml).not.toContain('>Active<');
    expect(realtimeHtml).not.toContain('>Signals<');
    expect(realtimeHtml).not.toContain('2 / 2 monitor.detail.metric.search.count');
    expect(realtimeHtml).not.toContain('class="space-y-4"');
    expect(realtimeHtml).not.toContain('monitor-detail-stage space-y-2 pt-0 monitor-detail-stage--overview');
    expect(realtimeHtml).not.toContain('monitor-detail-stage space-y-3 border-t border-[var(--ops-border-color)] pt-3 monitor-detail-stage--overview');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-list-variant="quiet-rows"');
    expect(realtimeHtml).not.toMatch(/>Add favorite<\/button>/);
    expect(realtimeHtml).not.toMatch(/>Remove favorite<\/button>/);
    expect(realtimeHtml).not.toContain('Metric catalog');
    expect(realtimeHtml).not.toContain('Metric fields');
    expect((realtimeHtml.match(/HertzBeat Collection/g) ?? []).length).toBe(0);
    expect(historyHtml).toContain('data-monitor-detail-history-layout="hertzbeat-ui-history-chart-grid"');
    expect(historyHtml).toContain('data-monitor-detail-history-reference="hertzbeat-ui-history-chart-grid"');
    expect(historyHtml).not.toContain('data-monitor-detail-flat-stage="true"');
    expect(historyHtml).not.toContain('data-observability-panel-tone="operator-sheet"');
    expect(historyHtml).toContain('data-hz-ui="monitor-history-chart-grid"');
    expect(historyHtml).toContain('data-monitor-history-chart-grid="shared-history-chart-grid"');
    expect(historyHtml).toContain('data-monitor-history-chart-grid-owner="hertzbeat-ui-history-chart-grid"');
    expect(historyHtml).toContain('data-monitor-history-chart-visual="shared-timeseries"');
    expect(historyHtml).toContain('data-monitor-history-axis-policy="sparse-readable"');
    expect(historyHtml).toContain('data-monitor-history-navigator="echarts-native-slider"');
    expect(historyHtml).toContain('data-monitor-history-datazoom-state="toolbar-feedback"');
    expect(historyHtml).toContain('data-monitor-history-datazoom-preserve="preserved"');
    expect(historyHtml).toContain('data-monitor-history-time-toolbar-owner="hertzbeat-ui-time-range-toolbar"');
    expect(historyHtml).toContain('data-hz-ui="time-range-toolbar"');
    expect(historyHtml).toContain('data-hz-time-range-toolbar-state="applied"');
    expect(historyHtml).not.toContain('data-time-range-control="hertzbeat-shared"');
    expect(historyHtml).toContain('data-hz-time-range-toolbar-time-entry="single-expression-picker"');
    expect(historyHtml).toContain('data-hz-time-range-toolbar-preset-placement="picker-panel"');
    expect(historyHtml).toContain('data-hz-time-range-toolbar-absolute="picker-panel"');
    expect(historyHtml).toContain('data-hz-expression-time-range-picker-layout="expression-single-range"');
    expect(historyHtml).not.toContain('data-monitor-history-time-range-select="true"');
    expect(historyHtml).toContain('data-monitor-history-time-range-option="last-1h"');
    expect(historyHtml).toContain('data-monitor-history-mode-owner="hertzbeat-ui-tabs"');
    expect(historyHtml).toContain('data-monitor-history-mode-active="raw"');
    expect(historyHtml).toContain('data-hz-ui="tabs"');
    expect(historyHtml).not.toContain('data-monitor-history-mode-option');
    expect(historyHtml).toContain('data-monitor-history-refresh-action="true"');
    expect(historyHtml).toContain('data-hz-ui="monitor-history-chart-card"');
    expect(historyHtml).toContain('data-monitor-history-card-owner="hertzbeat-ui-history-chart-card"');
    expect(historyHtml).toContain('data-monitor-history-card-source="hertzbeat-ui-history-chart"');
    expect(historyHtml).toContain('data-monitor-history-card-chrome="hertzbeat-ui-history-chart-inline"');
    expect(historyHtml).toContain('data-monitor-history-card-height="content-driven"');
    expect(historyHtml).not.toContain('angular-chart-cards');
    expect(historyHtml).not.toContain('angular-card-box');
    expect(historyHtml).not.toContain('angular-460px');
    expect(historyHtml).not.toContain('data-selected');
    expect(historyHtml).toContain('data-monitor-history-card="cpu:usage"');
    expect(historyHtml).toContain('data-monitor-history-card="memory:used"');
    expect(historyHtml).toContain('data-hz-ui="monitor-incremental-load-footer"');
    expect(historyHtml).toContain('data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"');
    expect(historyHtml).toContain('data-monitor-detail-incremental-mode="angular-chart-sentinel"');
    expect(historyHtml).toContain('data-monitor-detail-incremental-scope="history"');
    expect(historyHtml).toContain('data-hz-monitor-incremental-visible="2"');
    expect(historyHtml).toContain('data-hz-monitor-incremental-total="4"');
    expect(historyHtml).toContain('data-hz-monitor-incremental-action="load-more"');
    expect(historyHtml).toContain('data-monitor-history-card-action="favorite"');
    expect(historyHtml).toContain('data-monitor-history-card-action-owner="hertzbeat-ui-favorite-action"');
    expect(historyHtml).toContain('data-hz-ui="monitor-metric-favorite-action"');
    expect(historyHtml).not.toContain('monitor.detail.history-series.search.count');
    expect(historyHtml).not.toContain('monitor.detail.history-metric.search.count');
    expect(historyHtml).not.toContain('History store has not returned series yet.');
    expect(historyHtml).not.toContain('>history-panel<');
    expect(historyHtml).not.toContain('History catalog');
    expect(historyHtml).not.toContain('History series');
    expect(favoritesHtml).toContain('data-hz-ui="monitor-favorite-surface"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-owner="hertzbeat-ui-favorite-surface"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-layout="hertzbeat-ui-favorite-surface"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-feedback-copy="angular-favorite-copy"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-set-semantics="angular-set"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-active-fallback="angular-subselector-sticky"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-history-reload-reset="angular-chart-reload"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-empty-contract="angular-subselector-empty"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-selector="hertzbeat-ui-select-menu"');
    expect(favoritesHtml).toContain('data-hz-ui="select-menu"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-mode="realtime"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-realtime-incremental="angular-favorite-sentinel"');
    expect(favoritesHtml).toContain('data-hz-ui="monitor-favorite-pane"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-pane-owner="hertzbeat-ui-favorite-pane"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-realtime="shared-pane"');
    expect(favoritesHtml).toContain('data-monitor-detail-incremental-mode="angular-favorite-sentinel"');
    expect(favoritesHtml).toContain('data-monitor-detail-incremental-scope="favorite-realtime"');
    expect(favoritesHtml).not.toContain('data-monitor-detail-favorite-realtime="cards-lists"');
    expect(favoritesHtml).not.toContain('data-monitor-detail-favorite-history="cards"');
    expect(favoritesHtml).not.toContain('data-monitor-detail-flat-stage="true"');
    expect(favoritesHtml).not.toContain('data-observability-panel-tone="operator-sheet"');
    expect(favoritesHtml).not.toContain('realtime-panel');
    expect(favoritesHtml).not.toContain('Open live view');
    expect(favoritesHtml).not.toContain('Favorite catalog');
    expect(grafanaHtml).toContain('Grafana');
    expect(grafanaHtml).toContain('data-monitor-detail-flat-stage="true"');
    expect(grafanaHtml).toContain('data-hz-ui="monitor-detail-stage"');
    expect(grafanaHtml).toContain('data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"');
    expect(grafanaHtml).toContain('data-monitor-detail-grafana-layout-owner="hertzbeat-ui-detail-stage"');
    expect(grafanaHtml).toContain('data-monitor-detail-grafana-action-contract="angular-edit-config-delete-dashboard"');
    expect(grafanaHtml).toContain('data-monitor-detail-grafana-actions-contract="angular-dashboard-actions"');
    expect(grafanaHtml).toContain('data-monitor-detail-grafana-config-owner="hertzbeat-ui-button-link"');
    expect(grafanaHtml).toContain('data-monitor-detail-grafana-delete-action="delete-dashboard"');
    expect(grafanaHtml).toContain('data-monitor-detail-grafana-delete-teardown="angular-hide-tab"');
    expect(grafanaHtml).not.toContain('data-observability-panel-tone="operator-sheet"');
  }, 30000);

  it('routes favorites through the shared HertzBeat UI favorite surface instead of a preview workbench', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');

    expect(source).toContain('HzMonitorFavoriteSurface');
    expect(source).toContain('data-monitor-detail-favorite-owner="hertzbeat-ui-favorite-surface"');
    expect(source).toContain('data-monitor-detail-favorite-layout="hertzbeat-ui-favorite-surface"');
    expect(source).toContain('data-monitor-detail-favorite-feedback-copy="angular-favorite-copy"');
    expect(source).toContain('data-monitor-detail-favorite-set-semantics="angular-set"');
    expect(source).toContain('data-monitor-detail-favorite-active-fallback="angular-subselector-sticky"');
    expect(source).toContain('data-monitor-detail-favorite-history-reload-reset="angular-chart-reload"');
    expect(source).toContain('data-monitor-detail-favorite-empty-contract="angular-subselector-empty"');
    expect(source).toContain('data-monitor-detail-favorite-empty-teardown="angular-empty-no-sentinel"');
    expect(source).toContain('data-monitor-detail-favorite-realtime-incremental="angular-favorite-sentinel"');
    expect(source).toContain("'data-monitor-detail-favorite-selector': 'hertzbeat-ui-select-menu'");
    expect(source).toContain('HzMonitorFavoritePane');
    expect(source).toContain('data-monitor-detail-favorite-realtime="shared-pane"');
    expect(source).toContain('incrementalMode="angular-favorite-sentinel"');
    expect(source).toContain('incrementalScope="favorite-realtime"');
    expect(source).toContain('data-monitor-detail-favorite-history="shared-pane"');
    expect(source).toContain('data-monitor-detail-favorite-history-source="favorite-history-chart-payloads"');
    expect(source).toContain('data-monitor-detail-favorite-history-controls="angular-chart-toolbox"');
    expect(source).toContain('showControls={true}');
    expect(source).toContain('onRefresh={onFavoriteHistoryRefresh}');
    expect(source).toContain('onToggleFavorite={onToggleHistoryFavorite}');
    expect(source).not.toContain('data-monitor-detail-favorite-realtime="cards-lists"');
    expect(source).not.toContain('data-monitor-detail-favorite-history="cards"');
    expect(source).toContain("onSetFavoriteSurfaceMode(value as 'realtime' | 'history')");
    expect(source).not.toContain("import { Select } from '../ui/select'");
    expect(source).not.toContain('className="favorite-content');
    expect(source).not.toContain('<MonitorRealtimePanel');
    expect(source).not.toContain('<MonitorHistoryPanel');
    expect(source).not.toContain("title={t('monitor.detail.favorite.surface.title')}");
    expect(source).not.toContain("title={t('monitor.detail.favorite.catalog.title')}");
    expect(source).not.toContain("t('monitor.detail.favorite.surface.open')");
    expect(source).not.toContain('onPreviewFavorite');
    expect(source).not.toContain('ObservabilityControlChip');
    expect(source).not.toContain('ObservabilitySelectableCardGrid');
    expect(source).not.toContain('const favoriteSurfaceToggleClass =');
    expect(source).not.toContain('rounded-[2px] px-3 py-1.5 text-[12px] font-medium tracking-[0.03em] transition');
  });

  it('routes the basic monitor stage through monitor-data-table plain surface chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');
    const basicSurfaceSource = source.slice(
      source.indexOf('function MonitorBasicSharedSurface'),
      source.indexOf('export type MonitorSectionCompositionProps')
    );

    expect(source).not.toContain('function MonitorBasicPlainSurface');
    expect(basicSurfaceSource).toContain('HzMonitorBasicCard');
    expect(basicSurfaceSource).toContain('data-monitor-basic-owner="hertzbeat-ui-basic-card"');
    expect(basicSurfaceSource).not.toContain('data-monitor-basic-stage-surface="monitor-data-table"');
    expect(basicSurfaceSource).not.toContain('data-monitor-basic-grid-item="angular-first-card"');
    expect(basicSurfaceSource).not.toContain('data-monitor-basic-card-chrome="angular-card-box"');
    expect(basicSurfaceSource).not.toContain('min-h-[400px] min-w-0 grid content-start gap-3 rounded-[3px] border p-3');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-surface monitor-workbench-surface--plain');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-surface__header');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-card-title__kicker');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-card-title__summary');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-card-title__badge');
    expect(basicSurfaceSource).not.toContain('data-monitor-basic-source-badge-density="plain-meta"');
    expect(basicSurfaceSource).not.toContain('data-monitor-basic-edit-action="monitor-data-table"');
    expect(basicSurfaceSource).not.toContain('data-monitor-basic-edit-action-density="plain-icon"');
    expect(basicSurfaceSource).toContain('editHref');
    expect(basicSurfaceSource).not.toContain('Pencil');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-surface__edit inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent');
    expect(basicSurfaceSource).not.toContain('hover:border-[var(--ops-border-color)]');
    expect(basicSurfaceSource).not.toContain('monitor.detail.table.kicker.monitor');
    expect(basicSurfaceSource).not.toContain('monitor.detail.table.copy.monitor');
    expect(basicSurfaceSource).not.toContain('monitor.detail.chart.source.badge');
    expect(source).not.toContain('description={t(\'monitor.detail.workbench.copy\'');
  });

  it('keeps history as shared chart cards instead of the old drilldown/catalog stack', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');

    expect(source).toContain('data-monitor-detail-history-layout="hertzbeat-ui-history-chart-grid"');
    expect(source).toContain('data-monitor-detail-history-reference="hertzbeat-ui-history-chart-grid"');
    expect(source).toContain('showControls={true}');
    expect(source).toContain('historyWindow={historyWindow}');
    expect(source).toContain('historyWindows={historyWindows}');
    expect(source).toContain('onHistoryWindowChange={onHistoryWindowChange}');
    expect(source).not.toContain('<MonitorHistoryPanel');
    expect(source).not.toContain("title={t('monitor.detail.section.history-catalog.title')}");
    expect(source).not.toContain("title={t('monitor.detail.history.series.title')}");
    expect(source).not.toContain('ObservabilitySearchInput');
    expect(source).not.toContain('angular-chart-cards');
    expect(source).not.toContain('apache-hertzbeat-master-cards');
  });

  it('keeps metric signal rows free of redundant source badges and summary strips', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');
    const signalListSource = source.slice(
      source.indexOf('function MetricSignalList'),
      source.indexOf('export type MonitorSectionCompositionProps')
    );

    expect(source).not.toContain('function MetricSignalSummaryStrip');
    expect(source).not.toContain('data-monitor-detail-signal-summary-strip="monitor-data-table"');
    expect(source).not.toContain('data-monitor-detail-panel-summary-rhythm="angular-chip-row"');
    expect(source).not.toContain('data-monitor-detail-panel-summary-density="angular-pill-toolbar"');
    expect(source).not.toContain('data-monitor-detail-panel-summary-item={item.key}');
    expect(signalListSource).not.toContain('monitor-detail-panel-strip');
    expect(signalListSource).not.toContain('platform-facts-strip');
    expect(signalListSource).not.toContain('monitor.detail.panel.summary.total');
    expect(signalListSource).not.toContain('monitor.detail.panel.summary.visible');
    expect(signalListSource).not.toContain('monitor.detail.panel.summary.source');
    expect(source).toContain('HzMonitorDetailTabSequence');
    expect(source).not.toContain('function MonitorRealtimeTightSequence');
    expect(source).not.toContain('data-monitor-detail-tab-sequence="angular-tight"');
    expect(source).not.toContain("className={cn('monitor-detail-tab-sequence");
    expect(source).not.toContain('monitor-detail-tab-sequence monitor-detail-tab-sequence--angular-tight space-y-2');
    expect(signalListSource).not.toContain('monitor-detail-tab-sequence--angular-tight');
    expect(signalListSource).not.toContain('data-monitor-detail-tab-sequence="angular-tight"');
    expect(source).toContain('HzMonitorDetailStage');
    expect(source).not.toContain('function FlatStage');
    expect(source).not.toContain('data-monitor-detail-stage-rhythm={rhythm === \'angular-tight\' ? \'angular-tight\' : undefined}');
    expect(source).not.toContain('className="monitor-detail-stage monitor-detail-stage--signals');
    expect(source).not.toContain('className="monitor-detail-stage--signals"');
    expect(source).toContain('rhythm="tight"');
    expect(signalListSource).toContain('HzMonitorDetailSignalList');
    expect(signalListSource).toContain('data-monitor-detail-signal-list-owner="hertzbeat-ui-signal-list"');
    expect(signalListSource).toContain('data-monitor-detail-signal-list-rhythm="shared-tight"');
    expect(signalListSource).toContain('data-monitor-detail-signal-list-geometry="shared-two-column-metric-cards"');
    expect(signalListSource).not.toContain('className="space-y-2 pt-0.5"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-list-rhythm="angular-tight"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-list-geometry="angular-two-column-metric-cards"');
    expect(signalListSource).toContain('HzMonitorMetricCardGrid');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-flow="shared-metric-card-grid"');
    expect(signalListSource).not.toContain('data-monitor-detail-realtime-card-flow="angular-cards-list"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-grid="basic-and-metrics"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-reference="hertzbeat-ui-monitor-card-grid"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-height="content-driven"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-chrome="hertzbeat-ui-card-grid"');
    expect(signalListSource).toContain('{leadingCard}');
    expect(signalListSource).toContain('data-monitor-detail-card-grid-rhythm="shared-tight"');
    expect(signalListSource).toContain('data-monitor-detail-signal-grid="monitor-data-table"');
    expect(signalListSource).not.toContain('monitor-detail-card-grid monitor-detail-card-grid--realtime');
    expect(signalListSource).not.toContain('monitor-detail-signal-card-grid grid auto-rows-fr grid-cols-1 items-stretch gap-2 lg:grid-cols-2');
    expect(signalListSource).not.toContain('monitor-detail-signal-card-stack');
    expect(signalListSource).not.toContain('monitor-detail-signal-table divide-y divide-[var(--ops-border-color)] border-y border-[var(--ops-border-color)]');
    expect(signalListSource).toContain('HzMonitorMetricCard');
    expect(signalListSource).toContain('data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"');
    expect(signalListSource).not.toContain('monitor-detail-card--signal-row');
    expect(signalListSource).not.toContain('monitor-detail-card--signal-card-row');
    expect(signalListSource).toContain('data-monitor-detail-signal-row-density="shared-metric-card"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-row-density="angular-metric-card"');
    expect(signalListSource).toContain('data-monitor-detail-signal-card="true"');
    expect(signalListSource).toContain('data-monitor-detail-signal-card-chrome="hertzbeat-ui-metric-card"');
    expect(signalListSource).not.toContain('data-selected');
    expect(signalListSource).not.toContain('monitor-workbench-metric-table');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-card-table="true"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-card-body-density="angular-card-table"');
    expect(signalListSource).toContain('data-monitor-detail-signal-selected-style="left-rail"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-selected-style="angular-neutral"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-card-table-row="metric-fields"');
    expect(signalListSource).not.toContain('line-clamp-2');
    expect(signalListSource).not.toContain('hover:bg-[var(--ops-surface-panel)]');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-card-table-row="source"');
    expect(signalListSource).not.toContain('monitor.detail.table.kicker.metric');
    expect(signalListSource).not.toContain('monitor.detail.table.copy.metric');
    expect(signalListSource).not.toContain('monitor.detail.table.summary.fields');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-header-actions="plain-meta"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-source-badge="true"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-source-density="plain-meta"');
    expect(signalListSource).not.toContain('monitor-workbench-card-title__badge monitor-workbench-card-title__badge--plain px-0 py-0');
    expect(signalListSource).toContain('HzMonitorMetricFavoriteAction');
    expect(signalListSource).toContain('data-monitor-detail-signal-row-action="favorite"');
    expect(signalListSource).not.toContain('<Star');
    expect(source).not.toContain("import { Star } from 'lucide-react';");
    expect(signalListSource).not.toContain('bg-[var(--ops-surface-elevated)]');
    expect(signalListSource).not.toContain('border-[var(--ops-primary)]');
    expect(signalListSource).not.toContain('shadow-[inset_2px_0_0_var(--ops-primary)]');
    expect(signalListSource).not.toContain('shadow-[inset_2px_0_0_0_var(--ops-primary)]');
    expect(signalListSource).not.toContain("{t('common.signals')}");
    expect(signalListSource).not.toContain("monitor.detail.metric.search.count");
    expect(signalListSource).not.toContain('border-t pt-2 transition-colors');
    expect(signalListSource).not.toContain('<MonitorRealtimePanel');
    expect(signalListSource).not.toContain('<div className="space-y-4">');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-list-variant="quiet-rows"');
    expect(signalListSource).not.toContain("variant={favorited ? 'primary' : 'subtle'}");
  });

  it('keeps the grafana iframe frame flat instead of adding another inset panel', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');

    expect(source).toContain('HzButton');
    expect(source).toContain('HzButtonLink');
    expect(source).toContain('HzActionGroup');
    expect(source).toContain('HzMonitorEvidenceFrame');
    expect(source).toContain('data-monitor-detail-grafana-layout-owner="hertzbeat-ui-detail-stage"');
    expect(source).toContain('data-monitor-detail-grafana-action-contract="angular-edit-config-delete-dashboard"');
    expect(source).not.toContain('<div className="grid gap-3" data-monitor-detail-grafana-layout="flat-shared-ui">');
    expect(source).toContain('data-monitor-detail-grafana-status-owner="hertzbeat-ui-state-notice"');
    expect(source).toContain('variant="embedded"');
    expect(source).toContain('data-monitor-detail-grafana-frame-owner="hertzbeat-ui-evidence-frame"');
    expect(source).toContain('variant="media"');
    expect(source).not.toContain('className="overflow-hidden py-0"');
    expect(source).not.toContain('className="h-[720px] w-full border-0"');
    expect(source).toContain('data-monitor-detail-grafana-actions-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-monitor-detail-grafana-actions-contract="angular-dashboard-actions"');
    expect(source).toContain('data-monitor-detail-grafana-config-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-monitor-detail-grafana-config-action="monitor-edit-grafana"');
    expect(source).toContain('data-monitor-detail-grafana-delete-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-monitor-detail-grafana-delete-action="delete-dashboard"');
    expect(source).toContain('data-monitor-detail-grafana-delete-teardown="angular-hide-tab"');
    expect(source).toContain('data-monitor-detail-empty-scope="metric-search"');
    expect(source).not.toContain("import { Button } from '../ui/button'");
    expect(source).not.toContain("import { RowList } from '../workbench/workbench-page'");
    expect(source).not.toContain('<RowList');
    expect(source).not.toContain('ObservabilityInsetPanel');
    expect(source).not.toContain('overflow-hidden rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
    expect(source).not.toContain('className="overflow-hidden border-y border-[var(--hz-ui-line-soft)]"');
    expect(source).not.toContain('className="border-x-0"');
    expect(source).not.toContain('className="border-x-0 border-y-0"');
    expect(source).not.toContain('className="flex flex-wrap gap-2"');
    expect(source).not.toContain('border-[var(--ops-border-color)]');
    expect(source).not.toContain("from '../workbench/primitives'");
  });

  it('keeps monitor detail tab surfaces flat instead of stacking panel shells', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');

    expect(source).not.toContain('ObservabilityPanelShell');
    expect(source).not.toContain('data-observability-panel-tone="operator-sheet"');
    expect(source).not.toContain('function FlatStage');
    expect(source).toContain('HzMonitorDetailStage');
    expect(source).not.toContain("<FlatStage title={t('monitor.detail.section.metrics.title')}>");
  });
});
