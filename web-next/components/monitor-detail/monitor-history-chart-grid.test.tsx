import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { MonitorHistoryChartGrid } from './monitor-history-chart-grid';

const t = createTranslatorMock();
const zhT = createTranslatorMock({ locale: 'zh-CN' });

describe('monitor history chart grid', () => {
  it('uses the shared time range toolbar for visible history time navigation', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{}}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        showControls
        historyWindow="1h"
        timeContext={{ timeRange: 'last-1h', start: '1778985158146', end: '1778986674000' }}
        historyWindows={[
          { value: '30m', label: '30 minutes' },
          { value: '1h', label: '1 hour' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        onHistoryWindowChange={() => {}}
        onHistoryModeChange={() => {}}
        onRefresh={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-monitor-history-time-toolbar-owner="hertzbeat-ui-time-range-toolbar"');
    expect(html).toContain('data-monitor-history-datazoom-feedback="time-toolbar"');
    expect(html).toContain('data-monitor-history-refresh-contract="angular-first-page-reload"');
    expect(html).toContain('data-hz-ui="time-range-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-owner="hertzbeat-ui-time-range-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-state="applied"');
    expect(html).toContain('data-hz-time-range-toolbar-layout="compact-lined-controls"');
    expect(html).toContain('data-hz-time-range-toolbar-density="operator-single-row-tight"');
    expect(html).toContain('data-hz-time-range-toolbar-control-height="28"');
    expect(html).toContain('data-hz-time-range-toolbar-action-mode="icon-text"');
    expect(html).toContain('data-hz-time-range-toolbar-action="refresh"');
    expect(html).toContain('data-hz-time-range-toolbar-action="reset"');
    expect(html).toContain('data-hz-time-range-toolbar-action="apply"');
    expect(html).toContain('Refresh now');
    expect(html).toContain('Reset');
    expect(html).toContain('Apply');
    expect(html).toContain('data-hz-time-range-toolbar-time-entry="single-expression-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-preset-placement="picker-panel"');
    expect(html).toContain('data-hz-time-range-toolbar-absolute="picker-panel"');
    expect(html).toContain('data-hz-time-range-toolbar-absolute-layout="single-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-rail-layout="nowrap"');
    expect(html).toContain('data-hz-time-range-toolbar-overflow="horizontal-scroll"');
    expect(html).toContain('flex min-w-max flex-nowrap items-center gap-0.5');
    expect(html).toContain('data-hz-ui="expression-time-range-picker"');
    expect(html).toContain('data-hz-expression-time-range-picker-layout="expression-single-range"');
    expect(html).toContain('data-hz-expression-time-range-trigger="single-range"');
    expect(html).toContain('data-hz-expression-time-range-picker-trigger-width="compact"');
    expect(html).toContain('max-w-[280px]');
    expect(html).toContain('data-hz-expression-time-range-picker-panel-width="560"');
    expect(html).not.toContain('max-w-[320px]');
    expect(html).toContain('data-hz-time-range-toolbar-absolute-control="expression-time-range-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-absolute-input-mode="manual-text-with-picker"');
    expect(html).toContain('2026-05-17 10:32:38');
    expect(html).toContain('2026-05-17 10:57:54');
    expect(html).toContain('2026-05-17 10:32:38 - 2026-05-17 10:57:54');
    expect(html).not.toContain('type="datetime-local"');
    expect(html).not.toContain('data-hz-time-range-toolbar-preset-width="compact"');
    expect(html).not.toContain('data-monitor-history-time-range-select="true"');
    expect(html).not.toContain('value="1778985158146"');
    expect(html).not.toContain('value="1778986674000"');
    expect(html).toContain('data-hz-time-range-toolbar-family="signal-handoff-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-action-family="signal-handoff-toolbar"');
    expect(html).toContain('data-hz-time-range-toolbar-select-family="signal-handoff-toolbar"');
    expect(html).toContain('data-monitor-history-time-range-option="last-1h"');
    expect(html).toContain('data-monitor-history-refresh-action="true"');
    expect(html).toContain('border-[var(--hz-ui-line-soft)] bg-transparent');
    expect(html).not.toContain('border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]');
    expect(html).not.toContain('data-hz-time-range-toolbar-layout="stacked-operator-controls"');
    expect(html).not.toContain('bg-[var(--hz-ui-active)]');
    expect(html).not.toContain('min-w-[84px]');
    expect(html).not.toContain('min-w-[104px]');
    expect(html).not.toContain('data-time-range-control="hertzbeat-shared"');
  });

  it('keeps start and end controls visible on the first history render', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{}}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        showControls
        historyWindow="1h"
        historyWindows={[{ value: '1h', label: '1 hour' }]}
        onRefresh={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-absolute="picker-panel"');
    expect(html).toContain('data-hz-time-range-toolbar-absolute-layout="single-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-time-entry="single-expression-picker"');
    expect(html).toContain('data-hz-time-range-toolbar-rail-layout="nowrap"');
    expect(html).toContain('data-hz-ui="expression-time-range-picker"');
    expect(html).toContain('data-hz-expression-time-range-picker-layout="expression-single-range"');
    expect(html).toContain('aria-label="Time range"');
  });

  it('localizes shared time toolbar refresh and timezone options', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{}}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        showControls
        historyWindow="1h"
        historyWindows={[{ value: '1h', label: zhT('monitor.detail.history.range.last-1h') }]}
        onRefresh={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={zhT}
      />
    );

    expect(html).toContain(zhT('time.range.refresh'));
    expect(html).toContain(zhT('time.range.manual-refresh'));
    expect(html).toContain(zhT('time.range.local-timezone'));
    expect(html).not.toContain('Manual');
    expect(html).not.toContain('Local</span>');
  });

  it('externalizes every monitor history time picker label through i18n', () => {
    const source = readFileSync(join(__dirname, 'monitor-history-chart-grid.tsx'), 'utf8');

    [
      'time.range.relative',
      'time.range.recent-ranges',
      'time.range.custom-range',
      'time.range.custom-name',
      'time.range.save-custom-range',
      'time.range.validation-valid',
      'time.range.validation-invalid'
    ].forEach(key => {
      expect(source).toContain(`t('${key}')`);
    });

    [
      'Relative time',
      'Recent ranges',
      'Custom range',
      'Range name',
      'Save range',
      'Valid time expression',
      'Invalid time expression'
    ].forEach(copy => {
      expect(source).not.toContain(copy);
    });
  });

  it('passes canonical timezone values into the shared history time toolbar', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{}}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        showControls
        historyWindow="1h"
        timeContext={{ timeRange: 'last-1h', from: 'now-6h', to: 'now', timezone: 'Asia/Shanghai' }}
        historyWindows={[{ value: '1h', label: '1 hour' }]}
        onRefresh={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-model="expression-from-to"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-mode="named"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-value="Asia/Shanghai"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-route-key="timezone"');
    expect(html).toContain('Asia/Shanghai');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-control="shared-timezone-select"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option="local"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option-route-key="local"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option="Asia/Shanghai"');
    expect(html).toContain('data-hz-time-range-toolbar-timezone-option-route-key="timezone"');
  });

  it('passes canonical auto refresh seconds into the shared history time toolbar', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{}}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        showControls
        historyWindow="1h"
        timeContext={{ timeRange: 'last-1h', from: 'now-1h', to: 'now', refresh: '60', timezone: 'Asia/Shanghai' }}
        historyWindows={[{ value: '1h', label: '1 hour' }]}
        onRefresh={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-refresh-mode="auto"');
    expect(html).toContain('data-hz-time-range-toolbar-refresh-interval="60"');
    expect(html).toContain('data-hz-time-range-toolbar-live-state="running"');
    expect(html).not.toContain('data-hz-time-range-toolbar-refresh-interval="60s"');
  });

  it('renders live=false history routes as manual refresh even when stale refresh remains', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{}}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        showControls
        historyWindow="1h"
        timeContext={{ timeRange: 'last-1h', from: 'now-1h', to: 'now', refresh: '60', live: 'false' }}
        historyWindows={[{ value: '1h', label: '1 hour' }]}
        onRefresh={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-hz-time-range-toolbar-refresh-mode="manual"');
    expect(html).toContain('data-hz-time-range-toolbar-live-state="paused"');
    expect(html).not.toContain('data-hz-time-range-toolbar-refresh-interval="60"');
    expect(html).toContain('Manual');
    expect(html).not.toContain('>1m</span>');
  });

  it('uses the shared tab primitive for history aggregation mode selection', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{}}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated
        showControls
        historyWindow="1h"
        historyWindows={[{ value: '1h', label: '1 hour' }]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        onHistoryModeChange={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-monitor-history-mode-owner="hertzbeat-ui-tabs"');
    expect(html).toContain('data-monitor-history-mode-active="aggregated"');
    expect(html).toContain('data-hz-ui="tabs"');
    expect(html).toContain('Raw');
    expect(html).toContain('Aggregated');
    expect(html).not.toContain('data-monitor-history-mode-option');
  });

  it('uses the shared timeseries chart treatment without leaking raw history count keys', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{
          'summary:responseTime': {
            values: {
              origin: Array.from({ length: 61 }, (_, index) => ({
                time: new Date(2026, 4, 2, 20, 10, 0).getTime() + index * 60_000,
                origin: String(120 + index)
              }))
            }
          }
        }}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-monitor-history-chart-visual="shared-timeseries"');
    expect(html).toContain('data-monitor-history-source="app-yml-metric-catalog"');
    expect(html).toContain('data-monitor-history-template-source="monitor-yml"');
    expect(html).toContain('data-monitor-history-panel="summary:responseTime"');
    expect(html).toContain('data-monitor-history-panel-source="app-yml-metric-catalog"');
    expect(html).toContain('data-monitor-history-panel-metric="summary.responseTime"');
    expect(html).not.toContain('data-monitor-history-panel-unit');
    expect(html).not.toContain('data-dashboard-template');
    expect(html).not.toContain('data-dashboard-panel');
    expect(html).toContain('data-hz-ui="monitor-history-chart-grid"');
    expect(html).toContain('data-monitor-history-chart-grid-owner="hertzbeat-ui-history-chart-grid"');
    expect(html).toContain('data-monitor-history-chart-grid="shared-history-chart-grid"');
    expect(html).toContain('data-hz-ui="monitor-history-chart-card"');
    expect(html).toContain('data-monitor-history-card-owner="hertzbeat-ui-history-chart-card"');
    expect(html).toContain('data-monitor-history-card-source="hertzbeat-ui-history-chart"');
    expect(html).toContain('data-monitor-history-card-chrome="hertzbeat-ui-history-chart-inline"');
    expect(html).toContain('data-monitor-history-card-height="content-driven"');
    expect(html).toContain('data-monitor-history-card-selected="true"');
    expect(html).toContain('data-hz-ui="metric-time-series-panel"');
    expect(html).toContain('data-hz-metric-timeseries-variant="inline"');
    expect(html).toContain('data-hz-chart-surface-variant="inline"');
    expect(html).toContain('data-monitor-history-chart-treatment="collector-latency-inline"');
    expect(html).toContain('data-hz-chart-kind="metric-time-series-echarts"');
    expect(html).toContain('data-hz-ui="chart-surface"');
    expect(html).toContain('data-hz-chart-runtime="echarts"');
    expect(html).toContain('data-hz-chart-surface-selected="true"');
    expect(html).toContain('data-monitor-history-axis-policy="sparse-readable"');
    expect(html).toContain('data-monitor-history-navigator="echarts-native-slider"');
    expect(html).toContain('data-monitor-history-datazoom-state="toolbar-feedback"');
    expect(html).toContain('data-monitor-history-datazoom-feedback="time-toolbar"');
    expect(html).toContain('data-monitor-history-datazoom-preserve="preserved"');
    expect(html).toContain('61 samples');
    expect(html).not.toContain('angular-chart-cards');
    expect(html).not.toContain('angular-card-box');
    expect(html).not.toContain('angular-monitor-data-chart');
    expect(html).not.toContain('angular-460px');
    expect(html).not.toContain('data-selected');
    expect(html).not.toContain('var(--ops-primary)');
    expect(html).not.toContain('monitor.detail.history-series.search.count');
    expect(html).not.toContain('monitor.detail.history-metric.search.count');
  });

  it('renders history chart favorite actions through the shared monitor favorite icon', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: 'ms' } as any]}
        payloads={{
          'summary:responseTime': {
            values: {
              origin: [
                { time: 1_000, origin: '100' },
                { time: 2_000, origin: '120' }
              ]
            }
          }
        }}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        favoriteNames={['summary.responseTime']}
        onToggleFavorite={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={zhT}
      />
    );

    expect(html).toContain('data-monitor-history-card-action="favorite"');
    expect(html).toContain('data-monitor-history-card-action-owner="hertzbeat-ui-favorite-action"');
    expect(html).toContain('data-hz-ui="monitor-metric-favorite-action"');
    expect(html).toContain('data-hz-monitor-favorite-active="true"');
    expect(html).toContain(`aria-label="${zhT('monitor.detail.favorite.remove')}"`);
    expect(html).not.toContain('aria-label="Remove favorite"');
    expect(html).not.toMatch(new RegExp(`>${zhT('monitor.detail.favorite.remove')}<\\/button>`));
  });

  it('keeps chart dataZoom visible in the toolbar until the operator explicitly applies it as query time', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: 'ms' } as any]}
        payloads={{
          'summary:responseTime': {
            values: {
              origin: [
                { time: 1_000, origin: '100' },
                { time: 2_000, origin: '200' },
                { time: 3_000, origin: '150' }
              ]
            }
          }
        }}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        historyWindow="1h"
        onApplyChartZoomTimeRange={() => {}}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={t}
      />
    );

    expect(html).toContain('data-monitor-history-datazoom-state="toolbar-feedback"');
    expect(html).toContain('data-monitor-history-datazoom-feedback="time-toolbar"');
    expect(html).toContain('data-hz-echarts-datazoom-feedback="change-callback"');
    expect(html).toContain('data-hz-echarts-datazoom-interaction="native-live-drag"');
    expect(html).toContain('data-hz-echarts-datazoom-event="native-datazoom"');
    expect(html).toContain('data-hz-echarts-datazoom-preserve="preserved"');
    expect(html).toContain('data-monitor-history-zoom-apply="local-to-query-time"');
    expect(html).toContain('data-monitor-history-zoom-apply-state="idle"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Apply as query time');
  });

  it('keeps dataZoom feedback wired to the shared time toolbar source', () => {
    const source = readFileSync(join(process.cwd(), 'components/monitor-detail/monitor-history-chart-grid.tsx'), 'utf8');

    expect(source).toContain('HzTimeRangePreviewHandoff');
    expect(source).toContain('previewApplyTimeContext');
    expect(source).toContain('previewTimeContext');
    expect(source).toContain("data-monitor-history-datazoom-preview-state={previewTimeContext ? 'active' : 'idle'}");
    expect(source).toContain("previewSource={previewTimeContext ? 'chart-datazoom' : undefined}");
    expect(source).toContain('data-monitor-history-datazoom-handoff-owner="hertzbeat-ui-time-range-preview-handoff"');
    expect(source).toContain('source="chart-datazoom"');
    expect(source).toContain('from={previewTimeContext.from}');
    expect(source).toContain('to={previewTimeContext.to}');
    expect(source).toContain('applyDisabled={!previewApplyTimeContext}');
    expect(source).toContain('onApply={() => {');
    expect(source).toContain('onApplyChartZoomTimeRange?.(previewApplyTimeContext);');
    expect(source).toContain('setPreviewApplyTimeContext(null);');
    expect(source).toContain('onReset={() => {');
    expect(source).not.toContain("data-hz-time-range-toolbar-preview-source={previewTimeContext ? 'chart-datazoom' : undefined}");
    expect(source).toContain('setPreviewTimeContext(nextContext)');
    expect(source).toContain('setPreviewApplyTimeContext(nextApplyContext)');
    expect(source).toContain('onDataZoomChange={nextZoom => {');
    expect(source).toContain('handleChartZoomChange(key, nextZoom);');
    expect(source).toContain('showAbsoluteFields');
    expect(source).toContain('absoluteFieldsLayout="inline"');
    expect(source).toContain('absoluteInputMode="datetime-local"');
    expect(source).toContain('timeRangePickerMode="single"');
    expect(source).toContain('railLayout="nowrap"');
    expect(source).toContain('timeContext?.from');
    expect(source).toContain('timeContext?.to');
    expect(source).toContain('timeContext?.refresh');
    expect(source).toContain('timeContext?.live');
    expect(source).toContain('timeContext?.timezone');
    expect(source).toContain('timeContext?.tz');
    expect(source).toContain('data-monitor-history-datazoom-feedback="time-toolbar"');
  });

  it('does not keep an already-applied chart dataZoom range actionable after route synchronization', () => {
    const source = readFileSync(join(process.cwd(), 'components/monitor-detail/monitor-history-chart-grid.tsx'), 'utf8');

    expect(source).toContain('isSameTimeContextRange');
    expect(source).toContain('!isSameTimeContextRange(zoomApplyContext, timeContext)');
    expect(source).not.toContain('function isSameAppliedHistoryTimeContext(');
  });

  it('uses shared time window conversion for toolbar presets and dataZoom fallback ranges', () => {
    const source = readFileSync(join(process.cwd(), 'components/monitor-detail/monitor-history-chart-grid.tsx'), 'utf8');

    expect(source).toContain('timeRangeToTimeWindow');
    expect(source).toContain('timeWindowToTimeRange');
    expect(source).toContain('timeWindowToTimeRange(historyWindow || historyWindows[0]?.value)');
    expect(source).toContain('timeRangeToTimeWindow(context.timeRange)');
    expect(source).toContain('timeRangeToTimeWindow(resetContext.timeRange)');
    expect(source).not.toContain('function historyWindowToTimeRange(');
    expect(source).not.toContain('function timeRangeToHistoryWindow(');
  });

  it('clears local chart dataZoom drafts when the toolbar applies or resets query time', () => {
    const source = readFileSync(join(process.cwd(), 'components/monitor-detail/monitor-history-chart-grid.tsx'), 'utf8');

    expect(source).toContain('setZoomRangesByKey({});');
    expect((source.match(/setZoomRangesByKey\(\{\}\);/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('uses the metadata-preserving dataZoom context when applying chart zoom as query time', () => {
    const source = readFileSync(join(process.cwd(), 'components/monitor-detail/monitor-history-chart-grid.tsx'), 'utf8');

    expect(source).toContain('buildHistoryDataZoomApplyTimeContext');
    expect(source).toContain('const zoomApplyContext = buildHistoryDataZoomApplyTimeContext(');
    expect(source).toContain("'data-monitor-history-zoom-apply-url-model': 'expression-from-to'");
    expect(source).toContain("'data-monitor-history-zoom-apply-from': zoomApplyContext?.from");
    expect(source).toContain("'data-monitor-history-zoom-apply-to': zoomApplyContext?.to");
    expect(source).toContain('const canApplyZoom = Boolean(');
    expect(source).toContain('onApplyChartZoomTimeRange &&');
    expect(source.indexOf('onApplyChartZoomTimeRange?.(zoomApplyContext);')).toBeLessThan(
      source.indexOf('setZoomRangesByKey(current => ({ ...current, [key]: undefined }));')
    );
    expect(source).toContain('setPreviewTimeContext(null);');
    expect(source).toContain('setZoomRangesByKey(current => ({ ...current, [key]: undefined }));');
    expect(source).toContain('onApplyChartZoomTimeRange?.(zoomApplyContext);');
    expect(source).not.toContain('onApplyChartZoomTimeRange?.(zoomContext);');
  });

  it('resets applied dataZoom query time through the shared time toolbar instead of only clearing the local draft', () => {
    const source = readFileSync(join(process.cwd(), 'components/monitor-detail/monitor-history-chart-grid.tsx'), 'utf8');

    expect(source).toContain('onReset={() => {');
    expect(source).toContain('const resetContext = buildHistoryResetTimeContext(toolbarTimeContext, fallbackTimeRange);');
    expect(source).toContain('onHistoryTimeContextApply?.(resetContext);');
    expect(source).toContain('if (nextWindow) onHistoryWindowChange?.(nextWindow);');
  });

  it('keeps zh-CN sample counts and empty history copy localized', () => {
    const chartHtml = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'responseTime', unit: '' } as any]}
        payloads={{
          'summary:responseTime': {
            values: {
              origin: Array.from({ length: 61 }, (_, index) => ({
                time: new Date(2026, 4, 2, 20, 10, 0).getTime() + index * 60_000,
                origin: String(120 + index)
              }))
            }
          }
        }}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:responseTime"
        aggregated={false}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={zhT}
      />
    );
    const emptyHtml = renderToStaticMarkup(
      <MonitorHistoryChartGrid
        items={[{ metrics: 'summary', metric: 'keyword', unit: '' } as any]}
        payloads={{ 'summary:keyword': { values: { origin: [] } } as any }}
        loadingKeys={[]}
        errors={{}}
        selectedKey="summary:keyword"
        aggregated={false}
        onSelectMetric={() => {}}
        formatTime={value => `full-${value}`}
        t={zhT}
      />
    );

    expect(chartHtml).toContain(`61 ${zhT('monitor.detail.history-series.search.count')}`);
    expect(chartHtml).not.toContain('61 samples');
    expect(chartHtml).not.toContain('monitor.detail.history-series.search.count');
    expect(emptyHtml).toContain(zhT('monitor.detail.history.blocker.title'));
    expect(emptyHtml).toContain(zhT('monitor.detail.history.blocker.copy'));
    expect(emptyHtml).toContain('data-monitor-history-panel-state="history-store-empty"');
    expect(emptyHtml).not.toContain('History store has not returned series yet.');
  });
});
