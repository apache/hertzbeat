'use client';

import React from 'react';
import { EChartsPanel, type EChartsDataZoomRange } from '../observability/echarts-panel';
import { buildTimeRangeControlLabels, TimeRangeControl } from '../observability/time-range-control';
import { buildHistoryChartEChartsOption, buildHistoryDataZoomTimeContext } from '../../lib/monitor-detail/history-chart';
import type { TimeContext } from '../../lib/time-context';
import type { MonitorHistoryMetricCatalogItem } from '../../lib/monitor-detail/controller';
import type { MonitorHistoryData, MonitorHistoryValue } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function historyMetricKey(item: MonitorHistoryMetricCatalogItem) {
  return `${item.metrics}:${item.metric}`;
}

function historyMetricTitle(item: MonitorHistoryMetricCatalogItem) {
  return `${item.metrics}.${item.metric}`;
}

function pickPrimaryHistorySeries(payload: MonitorHistoryData | null | undefined): MonitorHistoryValue[] {
  const values = payload?.values ?? {};
  const preferred = values.origin || values.mean;
  if (preferred?.length) return preferred;

  const firstSeriesKey = Object.keys(values).find(key => values[key]?.length > 0);
  return firstSeriesKey == null ? [] : values[firstSeriesKey] || [];
}

function historyWindowToTimeRange(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith('last-')) return value.toLowerCase();
  return `last-${value.toLowerCase()}`;
}

function timeRangeToHistoryWindow(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.replace(/^last-/, '');
  return normalized.endsWith('w') ? normalized.replace('w', 'W') : normalized;
}

export function MonitorHistoryChartGrid({
  items,
  payloads,
  loadingKeys,
  errors,
  selectedKey,
  aggregated,
  showControls = false,
  historyWindow,
  timeContext,
  historyWindows = [],
  historyModes = [],
  onHistoryWindowChange,
  onHistoryTimeContextApply,
  onApplyChartZoomTimeRange,
  onHistoryModeChange,
  onRefresh,
  onSelectMetric,
  formatTime,
  t
}: {
  items: MonitorHistoryMetricCatalogItem[];
  payloads: Record<string, MonitorHistoryData | null | undefined>;
  loadingKeys: string[];
  errors: Record<string, string | undefined>;
  selectedKey: string | null;
  aggregated: boolean;
  showControls?: boolean;
  historyWindow?: string;
  timeContext?: TimeContext;
  historyWindows?: Array<{ value: string; label: string }>;
  historyModes?: Array<{ value: boolean; label: string }>;
  onHistoryWindowChange?: (value: string) => void;
  onHistoryTimeContextApply?: (context: TimeContext) => void;
  onApplyChartZoomTimeRange?: (context: TimeContext) => void;
  onHistoryModeChange?: (value: boolean) => void;
  onRefresh?: () => void;
  onSelectMetric: (key: string) => void;
  formatTime: (value?: number | string | null) => string;
  t: Translator;
}) {
  const [zoomRangesByKey, setZoomRangesByKey] = React.useState<Record<string, EChartsDataZoomRange | undefined>>({});

  const handleChartZoomChange = React.useCallback((key: string, nextZoom: EChartsDataZoomRange) => {
    setZoomRangesByKey(current => {
      const previous = current[key];
      if (
        previous?.start === nextZoom.start &&
        previous?.end === nextZoom.end &&
        previous?.startValue === nextZoom.startValue &&
        previous?.endValue === nextZoom.endValue
      ) {
        return current;
      }
      return { ...current, [key]: nextZoom };
    });
  }, []);
  if (items.length === 0) return null;

  const loadingSet = new Set(loadingKeys);

  return (
    <div
      className="space-y-2"
      data-monitor-history-chart-grid="angular-chart-cards"
      data-monitor-history-chart-visual="shared-timeseries"
      data-monitor-history-axis-policy="sparse-readable"
      data-monitor-history-navigator="echarts-native-slider"
      data-monitor-history-datazoom-state="local-observation"
      data-monitor-history-datazoom-preserve="preserved"
    >
      {showControls ? (
        <div
          className="space-y-2"
          data-monitor-history-time-toolbar="shared-time-context-control"
          data-monitor-history-time-toolbar-visual="cold-metrics-controls"
        >
          <TimeRangeControl
            value={timeContext || { timeRange: historyWindowToTimeRange(historyWindow || historyWindows[0]?.value) }}
            presets={historyWindows.map(option => ({
              value: historyWindowToTimeRange(option.value) || option.value,
              label: option.label
            }))}
            labels={{
              ...buildTimeRangeControlLabels(t),
              preset: t('monitor.detail.history.time-range'),
            }}
            onApply={(context: TimeContext) => {
              onHistoryTimeContextApply?.(context);
              const nextWindow = timeRangeToHistoryWindow(context.timeRange);
              if (nextWindow) onHistoryWindowChange?.(nextWindow);
            }}
            onRefresh={onRefresh}
            presetSelectProps={{ 'data-monitor-history-time-range-select': 'true' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
            presetOptionDataAttribute="data-monitor-history-time-range-option"
            refreshActionProps={{ 'data-monitor-history-refresh-action': 'true' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
          />
          {historyModes.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {historyModes.map(option => (
                <button
                  key={String(option.value)}
                  type="button"
                  className={[
                    'inline-flex h-8 items-center justify-center rounded-[3px] border px-3 text-[12px] font-semibold transition-colors',
                    aggregated === option.value
                      ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
                      : 'border-[var(--ops-border-color)] bg-transparent text-[var(--ops-text-secondary)] hover:border-[var(--ops-border-strong)] hover:bg-[var(--ops-surface-panel)] hover:text-[var(--ops-text-primary)]'
                  ].join(' ')}
                  data-monitor-history-mode-select={String(option.value)}
                  data-monitor-history-mode-option={String(option.value)}
                  onClick={() => onHistoryModeChange?.(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-2 xl:grid-cols-2">
        {items.map(item => {
          const key = historyMetricKey(item);
          const title = historyMetricTitle(item);
          const selected = selectedKey === key;
          const values = pickPrimaryHistorySeries(payloads[key]);
          const loading = loadingSet.has(key);
          const error = errors[key];
          const zoomContext = buildHistoryDataZoomTimeContext(values, zoomRangesByKey[key], historyWindowToTimeRange(historyWindow));
          const canApplyZoom = Boolean(zoomContext && onApplyChartZoomTimeRange);
          const option = buildHistoryChartEChartsOption({
            values,
            formatTime,
            aggregated,
            visibleSeriesKeys: aggregated ? ['mean', 'min', 'max'] : ['origin']
          });

          return (
            <section
              key={key}
              role="button"
              tabIndex={0}
              className={[
                'monitor-detail-card monitor-detail-card--history-flat monitor-workbench-surface monitor-workbench-surface--plain min-h-[460px] min-w-0 space-y-3 rounded-[3px] border bg-[var(--ops-surface-raised)] p-3 transition-colors',
                selected ? 'border-[var(--ops-primary)]' : 'border-[var(--ops-border-color)] hover:border-[var(--ops-border-strong)]'
              ].join(' ')}
              data-monitor-history-card={key}
              data-monitor-history-card-source="angular-monitor-data-chart"
              data-monitor-history-card-chrome="angular-card-box"
              data-monitor-history-card-height="angular-460px"
              data-selected={selected ? 'true' : 'false'}
              onClick={() => onSelectMetric(key)}
              onKeyDown={event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelectMetric(key);
              }}
            >
              <header className="monitor-workbench-surface__header flex items-start justify-between gap-3 border-b border-[var(--ops-border-color)] pb-2">
                <div className="monitor-workbench-card-title__copy min-w-0">
                  <div className="monitor-workbench-card-title__title truncate text-[16px] font-semibold leading-6 text-[var(--ops-text-primary)]">
                    {title}
                  </div>
                </div>
                <div className="flex flex-none items-center gap-2">
                  {item.unit ? (
                    <span className="text-[11px] font-semibold text-[var(--ops-text-tertiary)]">{item.unit}</span>
                  ) : null}
                  {onApplyChartZoomTimeRange ? (
                    <button
                      type="button"
                      className="inline-flex h-7 items-center justify-center rounded-[3px] border border-[var(--ops-border-color)] bg-transparent px-2 text-[11px] font-semibold text-[var(--ops-text-secondary)] transition-colors enabled:hover:border-[var(--ops-border-strong)] enabled:hover:bg-[var(--ops-surface-panel)] enabled:hover:text-[var(--ops-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
                      data-monitor-history-zoom-apply="local-to-query-time"
                      data-monitor-history-zoom-apply-state={canApplyZoom ? 'ready' : 'idle'}
                      disabled={!canApplyZoom}
                      onClick={event => {
                        event.stopPropagation();
                        if (!zoomContext) return;
                        onApplyChartZoomTimeRange(zoomContext);
                      }}
                    >
                      {t('monitor.detail.history.zoom.apply')}
                    </button>
                  ) : null}
                </div>
              </header>

              {loading ? (
                <div className="border-y border-[var(--ops-border-color)] px-3 py-12 text-sm text-[var(--ops-text-secondary)]">
                  {t('common.loading')}
                </div>
              ) : error ? (
                <div className="border-y border-rose-400/20 bg-rose-400/10 px-3 py-12 text-sm text-rose-200">
                  {error}
                </div>
              ) : values.length > 0 ? (
                <EChartsPanel
                  option={option}
                  height={360}
                  className="rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-transparent"
                  tone="operator"
                  preserveDataZoom
                  onDataZoomChange={nextZoom => handleChartZoomChange(key, nextZoom)}
                />
              ) : (
                <div className="border-y border-[var(--ops-border-color)] px-3 py-12 text-sm text-[var(--ops-text-secondary)]">
                  <div className="font-medium text-[var(--ops-text-primary)]">{t('monitor.detail.history.blocker.title')}</div>
                  <div className="mt-1">{t('monitor.detail.history.blocker.copy')}</div>
                </div>
              )}
              <div className="text-[12px] text-[var(--ops-text-tertiary)]">
                {values.length ? `${values.length} ${t('monitor.detail.history-series.search.count')}` : '-'}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
