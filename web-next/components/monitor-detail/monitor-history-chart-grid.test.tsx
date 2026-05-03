import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { MonitorHistoryChartGrid } from './monitor-history-chart-grid';

const t = createTranslatorMock();
const zhT = createTranslatorMock({ locale: 'zh-CN' });

describe('monitor history chart grid', () => {
  it('uses the shared TimeRangeControl for visible history time navigation', () => {
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

    expect(html).toContain('data-monitor-history-time-toolbar="shared-time-context-control"');
    expect(html).toContain('data-time-range-control="hertzbeat-shared"');
    expect(html).toContain('data-time-range-control-visual="cold-operator-toolbar"');
    expect(html).toContain('data-monitor-history-time-range-select="true"');
    expect(html).toContain('data-monitor-history-time-range-option="last-1h"');
    expect(html).toContain('data-monitor-history-refresh-action="true"');
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
    expect(html).toContain('data-monitor-history-axis-policy="sparse-readable"');
    expect(html).toContain('data-monitor-history-navigator="echarts-native-slider"');
    expect(html).toContain('data-monitor-history-datazoom-state="local-observation"');
    expect(html).toContain('data-monitor-history-datazoom-preserve="preserved"');
    expect(html).toContain('data-monitor-history-card-height="angular-460px"');
    expect(html).toContain('61 samples');
    expect(html).not.toContain('monitor.detail.history-series.search.count');
    expect(html).not.toContain('monitor.detail.history-metric.search.count');
  });

  it('keeps chart dataZoom local until the operator explicitly applies it as query time', () => {
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

    expect(html).toContain('data-monitor-history-datazoom-state="local-observation"');
    expect(html).toContain('data-monitor-history-zoom-apply="local-to-query-time"');
    expect(html).toContain('data-monitor-history-zoom-apply-state="idle"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Apply as query time');
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

    expect(chartHtml).toContain('61 个采样点');
    expect(chartHtml).not.toContain('61 samples');
    expect(chartHtml).not.toContain('monitor.detail.history-series.search.count');
    expect(emptyHtml).toContain('历史未就绪');
    expect(emptyHtml).toContain('历史查询还没有返回可用序列。');
    expect(emptyHtml).not.toContain('History store has not returned series yet.');
  });
});
