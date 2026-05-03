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
      favoriteNames: [],
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
      grafanaState: { enabled: false },
      grafanaMessage: null,
      grafanaError: null,
      favoriteMessage: null,
      favoriteError: null,
      onMetricSearchChange: () => {},
      onSelectMetric: () => {},
      onToggleFavorite: () => {},
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
      onHistoryWindowChange: () => {},
      onHistoryModeChange: () => {},
      onHistoryFullscreenToggle: () => {},
      onSelectFavorite: () => {},
      onSetFavoriteSurfaceMode: () => {},
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
    expect(realtimeHtml).toContain('data-monitor-basic-edit-action="monitor-data-table"');
    expect(realtimeHtml).toContain('href="/monitors/42/edit?app=http"');
    expect(realtimeHtml).toContain('aria-label="Edit monitor"');
    expect(realtimeHtml).toContain('summary-card');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-flow="angular-cards-list"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-grid="basic-and-metrics"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-reference="apache-hertzbeat-master-cards-lists"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-height="angular-400px"');
    expect(realtimeHtml).toContain('data-monitor-detail-realtime-card-chrome="angular-card-box"');
    expect(realtimeHtml).toContain('data-monitor-basic-grid-item="angular-first-card"');
    expect(realtimeHtml.indexOf('data-monitor-basic-grid-item="angular-first-card"')).toBeLessThan(
      realtimeHtml.indexOf('data-monitor-detail-signal-row="summary"')
    );
    expect(realtimeHtml.indexOf('data-monitor-detail-signal-row="summary"')).toBeLessThan(
      realtimeHtml.indexOf('data-monitor-detail-signal-row="header"')
    );
    expect(realtimeHtml).toContain('data-monitor-basic-stage-surface="monitor-data-table"');
    expect(realtimeHtml).toContain('data-monitor-basic-card-chrome="angular-card-box"');
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-workbench-surface[^\"]*monitor-workbench-surface--plain/);
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-workbench-surface__header/);
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-workbench-card-title__title/);
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
    expect(realtimeHtml).toContain('data-monitor-detail-tab-sequence="angular-tight"');
    expect(realtimeHtml).toContain('data-monitor-detail-stage-rhythm="angular-tight"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-list-rhythm="angular-tight"');
    expect(realtimeHtml).toContain('data-monitor-detail-card-grid-rhythm="angular-tight"');
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-detail-tab-sequence[^\"]*monitor-detail-tab-sequence--angular-tight[^\"]*space-y-2/);
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
    expect(realtimeHtml).toContain('data-monitor-detail-signal-list-geometry="angular-two-column-metric-cards"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-row-density="angular-metric-card"');
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-detail-card-grid[^\"]*monitor-detail-card-grid--realtime/);
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-detail-signal-card-grid[^\"]*grid[^\"]*grid-cols-1[^\"]*gap-2[^\"]*lg:grid-cols-2/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-signal-card-stack/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-signal-table[^\"]*divide-y/);
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-detail-card[^\"]*monitor-detail-card--signal-flat/);
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-detail-card--signal-metric/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card--signal-row/);
    expect(realtimeHtml).not.toMatch(/class=\"[^\"]*monitor-detail-card--signal-card-row/);
    expect(realtimeHtml).not.toContain('monitor-realtime-data-table');
    expect(realtimeHtml).toMatch(/class=\"[^\"]*min-h-\[400px\][^\"]*grid[^\"]*content-start[^\"]*gap-3[^\"]*rounded-\[3px\][^\"]*border[^\"]*p-3/);
    expect(realtimeHtml).toMatch(/class=\"[^\"]*monitor-detail-stage[^\"]*monitor-detail-stage--signals/);
    expect(realtimeHtml).toContain('data-monitor-detail-signal-row="summary"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card="true"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card-chrome="angular-card-box"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card-table="true"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card-body-density="angular-card-table"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-selected-style="angular-neutral"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-selected-style="left-rail"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-card-table-row="metric-fields"');
    expect(realtimeHtml).toContain('data-monitor-detail-signal-row-title="true"');
    expect(realtimeHtml).not.toMatch(/>\s*\d+\s+(?:Fields|字段)\s*</);
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-card-table-row="source"');
    expect(realtimeHtml).not.toContain('Real-time Metric');
    expect(realtimeHtml).not.toContain('This card shows the latest sampled result for summary while keeping the native HertzBeat collection semantics.');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-header-actions="plain-meta"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-source-badge="true"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-source-density="plain-meta"');
    expect(realtimeHtml).not.toContain('data-monitor-detail-signal-row-action="favorite"');
    expect(realtimeHtml).not.toContain('aria-label="Add favorite"');
    expect(realtimeHtml).not.toContain('aria-label="Remove favorite"');
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
    expect(historyHtml).toContain('data-monitor-detail-history-layout="angular-chart-cards-only"');
    expect(historyHtml).toContain('data-monitor-detail-history-reference="apache-hertzbeat-master-cards"');
    expect(historyHtml).not.toContain('data-monitor-detail-flat-stage="true"');
    expect(historyHtml).not.toContain('data-observability-panel-tone="operator-sheet"');
    expect(historyHtml).toContain('data-monitor-history-chart-grid="angular-chart-cards"');
    expect(historyHtml).toContain('data-monitor-history-chart-visual="shared-timeseries"');
    expect(historyHtml).toContain('data-monitor-history-axis-policy="sparse-readable"');
    expect(historyHtml).toContain('data-monitor-history-navigator="echarts-native-slider"');
    expect(historyHtml).toContain('data-monitor-history-datazoom-state="local-observation"');
    expect(historyHtml).toContain('data-monitor-history-datazoom-preserve="preserved"');
    expect(historyHtml).toContain('data-monitor-history-time-toolbar="shared-time-context-control"');
    expect(historyHtml).toContain('data-time-range-control="hertzbeat-shared"');
    expect(historyHtml).toContain('data-time-range-control-state="applied"');
    expect(historyHtml).toContain('data-monitor-history-time-range-select="true"');
    expect(historyHtml).toContain('data-monitor-history-time-range-option="last-1h"');
    expect(historyHtml).toContain('data-monitor-history-mode-select="false"');
    expect(historyHtml).toContain('data-monitor-history-refresh-action="true"');
    expect(historyHtml).toContain('data-monitor-history-card-chrome="angular-card-box"');
    expect(historyHtml).toContain('data-monitor-history-card-height="angular-460px"');
    expect(historyHtml).toContain('data-monitor-history-card="cpu:usage"');
    expect(historyHtml).toContain('data-monitor-history-card="memory:used"');
    expect(historyHtml).not.toContain('monitor.detail.history-series.search.count');
    expect(historyHtml).not.toContain('monitor.detail.history-metric.search.count');
    expect(historyHtml).not.toContain('History store has not returned series yet.');
    expect(historyHtml).not.toContain('history-panel');
    expect(historyHtml).not.toContain('History catalog');
    expect(historyHtml).not.toContain('History series');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-layout="angular-favorite-content"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-selector="angular-select-200"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-mode="realtime"');
    expect(favoritesHtml).toContain('data-monitor-detail-favorite-realtime="cards-lists"');
    expect(favoritesHtml).not.toContain('data-monitor-detail-flat-stage="true"');
    expect(favoritesHtml).not.toContain('data-observability-panel-tone="operator-sheet"');
    expect(favoritesHtml).not.toContain('realtime-panel');
    expect(favoritesHtml).not.toContain('Open live view');
    expect(favoritesHtml).not.toContain('Favorite catalog');
    expect(grafanaHtml).toContain('Grafana');
    expect(grafanaHtml).toContain('data-monitor-detail-flat-stage="true"');
    expect(grafanaHtml).not.toContain('data-observability-panel-tone="operator-sheet"');
  }, 30000);

  it('routes favorites through the Angular favorite selector content instead of a preview workbench', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');

    expect(source).toContain('data-monitor-detail-favorite-layout="angular-favorite-content"');
    expect(source).toContain('data-monitor-detail-favorite-selector="angular-select-200"');
    expect(source).toContain('data-monitor-detail-favorite-realtime="cards-lists"');
    expect(source).toContain('data-monitor-detail-favorite-history="cards"');
    expect(source).toContain('onSetFavoriteSurfaceMode(event.target.value as');
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
      source.indexOf('function MonitorBasicPlainSurface'),
      source.indexOf('export type MonitorSectionCompositionProps')
    );

    expect(basicSurfaceSource).toContain('data-monitor-basic-stage-surface="monitor-data-table"');
    expect(basicSurfaceSource).toContain('data-monitor-basic-grid-item="angular-first-card"');
    expect(basicSurfaceSource).toContain('data-monitor-basic-card-chrome="angular-card-box"');
    expect(basicSurfaceSource).toContain('min-h-[400px] min-w-0 grid content-start gap-3 rounded-[3px] border p-3');
    expect(basicSurfaceSource).toContain('monitor-workbench-surface monitor-workbench-surface--plain');
    expect(basicSurfaceSource).toContain('monitor-workbench-surface__header');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-card-title__kicker');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-card-title__summary');
    expect(basicSurfaceSource).not.toContain('monitor-workbench-card-title__badge');
    expect(basicSurfaceSource).not.toContain('data-monitor-basic-source-badge-density="plain-meta"');
    expect(basicSurfaceSource).toContain('data-monitor-basic-edit-action="monitor-data-table"');
    expect(basicSurfaceSource).toContain('data-monitor-basic-edit-action-density="plain-icon"');
    expect(basicSurfaceSource).toContain('editHref');
    expect(basicSurfaceSource).toContain('Pencil');
    expect(basicSurfaceSource).toContain('monitor-workbench-surface__edit inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent');
    expect(basicSurfaceSource).not.toContain('hover:border-[var(--ops-border-color)]');
    expect(basicSurfaceSource).not.toContain('monitor.detail.table.kicker.monitor');
    expect(basicSurfaceSource).not.toContain('monitor.detail.table.copy.monitor');
    expect(basicSurfaceSource).not.toContain('monitor.detail.chart.source.badge');
    expect(source).not.toContain('description={t(\'monitor.detail.workbench.copy\'');
  });

  it('keeps history as direct Angular chart cards instead of the old drilldown/catalog stack', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');

    expect(source).toContain('data-monitor-detail-history-layout="angular-chart-cards-only"');
    expect(source).toContain('data-monitor-detail-history-reference="apache-hertzbeat-master-cards"');
    expect(source).toContain('showControls={true}');
    expect(source).toContain('historyWindow={historyWindow}');
    expect(source).toContain('historyWindows={historyWindows}');
    expect(source).toContain('onHistoryWindowChange={onHistoryWindowChange}');
    expect(source).not.toContain('<MonitorHistoryPanel');
    expect(source).not.toContain("title={t('monitor.detail.section.history-catalog.title')}");
    expect(source).not.toContain("title={t('monitor.detail.history.series.title')}");
    expect(source).not.toContain('ObservabilitySearchInput');
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
    expect(signalListSource).toContain('data-monitor-detail-tab-sequence="angular-tight"');
    expect(signalListSource).toContain('monitor-detail-tab-sequence monitor-detail-tab-sequence--angular-tight space-y-2');
    expect(source).toContain('data-monitor-detail-stage-rhythm={rhythm === \'angular-tight\' ? \'angular-tight\' : undefined}');
    expect(source).toContain('rhythm="angular-tight"');
    expect(signalListSource).toContain('data-monitor-detail-signal-list-rhythm="angular-tight"');
    expect(signalListSource).toContain('data-monitor-detail-signal-list-geometry="angular-two-column-metric-cards"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-flow="angular-cards-list"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-grid="basic-and-metrics"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-reference="apache-hertzbeat-master-cards-lists"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-height="angular-400px"');
    expect(signalListSource).toContain('data-monitor-detail-realtime-card-chrome="angular-card-box"');
    expect(signalListSource).toContain('{leadingCard}');
    expect(signalListSource).toContain('data-monitor-detail-card-grid-rhythm="angular-tight"');
    expect(signalListSource).toContain('data-monitor-detail-signal-grid="monitor-data-table"');
    expect(signalListSource).toContain('monitor-detail-card-grid monitor-detail-card-grid--realtime');
    expect(signalListSource).toContain('monitor-detail-signal-card-grid grid auto-rows-fr grid-cols-1 items-stretch gap-2 lg:grid-cols-2');
    expect(signalListSource).not.toContain('monitor-detail-signal-card-stack');
    expect(signalListSource).not.toContain('monitor-detail-signal-table divide-y divide-[var(--ops-border-color)] border-y border-[var(--ops-border-color)]');
    expect(signalListSource).toContain('monitor-detail-card monitor-detail-card--signal-flat');
    expect(signalListSource).toContain('monitor-detail-card--signal-metric');
    expect(signalListSource).not.toContain('monitor-detail-card--signal-row');
    expect(signalListSource).not.toContain('monitor-detail-card--signal-card-row');
    expect(signalListSource).toContain('data-monitor-detail-signal-row-density="angular-metric-card"');
    expect(signalListSource).toContain('min-h-[400px] min-w-0 grid content-start gap-3 rounded-[3px] border p-3');
    expect(signalListSource).toContain('data-monitor-detail-signal-row-title="true"');
    expect(signalListSource).toContain('data-monitor-detail-signal-card="true"');
    expect(signalListSource).toContain('data-monitor-detail-signal-card-chrome="angular-card-box"');
    expect(signalListSource).toContain('data-monitor-detail-signal-card-table="true"');
    expect(signalListSource).toContain('data-monitor-detail-signal-card-body-density="angular-card-table"');
    expect(signalListSource).toContain('data-monitor-detail-signal-selected-style="angular-neutral"');
    expect(signalListSource).not.toContain('data-monitor-detail-signal-selected-style="left-rail"');
    expect(signalListSource).toContain('data-monitor-detail-signal-card-table-row="metric-fields"');
    expect(signalListSource).toContain('border-b border-[var(--ops-border-color)] pb-2');
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
    expect(signalListSource).not.toContain('data-monitor-detail-signal-row-action="favorite"');
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

    expect(source).not.toContain('ObservabilityInsetPanel');
    expect(source).not.toContain('overflow-hidden rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
    expect(source).not.toContain("from '../workbench/primitives'");
  });

  it('keeps monitor detail tab surfaces flat instead of stacking panel shells', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');

    expect(source).not.toContain('ObservabilityPanelShell');
    expect(source).not.toContain('data-observability-panel-tone="operator-sheet"');
    expect(source).not.toContain("<FlatStage title={t('monitor.detail.section.metrics.title')}>");
  });
});
