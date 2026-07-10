'use client';

import React from 'react';
import {
  HzMonitorHistoryChartCard,
  HzMonitorHistoryChartGrid,
  HzMonitorMetricFavoriteAction,
  HzSegmentedTabs,
  HzTimeRangePreviewHandoff,
  HzTimeRangeToolbar,
  type HzEChartsDataZoomRange
} from '@hertzbeat/ui';
import {
  buildHistoryChartEChartsOption,
  buildHistoryDataZoomApplyTimeContext,
  buildHistoryDataZoomPreviewTimeContext,
  buildHistoryResetTimeContext
} from '../../lib/monitor-detail/history-chart';
import { isSameTimeContextRange, timeRangeToTimeWindow, timeWindowToTimeRange, type TimeContext } from '../../lib/time-context';
import type { MonitorHistoryMetricCatalogItem } from '../../lib/monitor-detail/controller';
import type { MonitorHistoryData, MonitorHistoryValue } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function historyMetricKey(item: MonitorHistoryMetricCatalogItem) {
  return `${item.metrics}:${item.metric}`;
}

function historyMetricTitle(item: MonitorHistoryMetricCatalogItem) {
  return `${item.metrics}.${item.metric}`;
}

function resolveHistoryFavoriteToken(item: MonitorHistoryMetricCatalogItem, favoriteNames: string[]) {
  const fullPath = historyMetricTitle(item);
  return favoriteNames.find(name => name === fullPath || name === item.metrics || name === item.metric) ?? null;
}

function pickPrimaryHistorySeries(payload: MonitorHistoryData | null | undefined): MonitorHistoryValue[] {
  const values = payload?.values ?? {};
  const preferred = values.origin || values.mean;
  if (preferred?.length) return preferred;

  const firstSeriesKey = Object.keys(values).find(key => values[key]?.length > 0);
  return firstSeriesKey == null ? [] : values[firstSeriesKey] || [];
}

function buildVisibleHistoryTimeContext(
  items: MonitorHistoryMetricCatalogItem[],
  payloads: Record<string, MonitorHistoryData | null | undefined>,
  fallbackTimeRange?: string
): TimeContext {
  const times = items
    .flatMap(item => pickPrimaryHistorySeries(payloads[historyMetricKey(item)]))
    .map(value => Number(value.time))
    .filter(value => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (times.length < 2) return { timeRange: fallbackTimeRange };

  return {
    timeRange: fallbackTimeRange,
    start: String(times[0]),
    end: String(times[times.length - 1])
  };
}

function buildHistoryTimeToolbarLabels(t: Translator) {
  return {
    preset: t('monitor.detail.history.time-range'),
    start: t('time.range.start'),
    end: t('time.range.end'),
    from: t('time.range.from'),
    to: t('time.range.to'),
    absoluteTitle: t('time.range.absolute-title'),
    quickRanges: t('time.range.quick-ranges'),
    relativeTitle: t('time.range.relative'),
    recentRanges: t('time.range.recent-ranges'),
    customRange: t('time.range.custom-range'),
    customName: t('time.range.custom-name'),
    saveCustomRange: t('time.range.save-custom-range'),
    deleteCustomRange: t('time.range.delete-custom-range'),
    validationValid: t('time.range.validation-valid'),
    validationInvalid: t('time.range.validation-invalid'),
    year: t('time.range.year'),
    month: t('time.range.month'),
    weekdays: [
      t('common.week.1'),
      t('common.week.2'),
      t('common.week.3'),
      t('common.week.4'),
      t('common.week.5'),
      t('common.week.6'),
      t('common.week.7')
    ],
    months: [
      t('common.month.1'),
      t('common.month.2'),
      t('common.month.3'),
      t('common.month.4'),
      t('common.month.5'),
      t('common.month.6'),
      t('common.month.7'),
      t('common.month.8'),
      t('common.month.9'),
      t('common.month.10'),
      t('common.month.11'),
      t('common.month.12')
    ],
    date: t('time.range.date'),
    hour: t('time.range.hour'),
    minute: t('time.range.minute'),
    second: t('time.range.second'),
    previousMonth: t('time.range.previous-month'),
    nextMonth: t('time.range.next-month'),
    previousYears: t('time.range.previous-years'),
    nextYears: t('time.range.next-years'),
    decrease: t('time.range.decrease'),
    increase: t('time.range.increase'),
    clear: t('common.clear'),
    absolutePlaceholder: t('time.range.unset'),
    refresh: t('time.range.refresh'),
    timezone: t('time.range.timezone'),
    apply: t('time.range.apply'),
    applyAria: t('time.range.apply-aria'),
    refreshAction: t('time.range.refresh-action'),
    reset: t('time.range.reset'),
    resetAria: t('time.range.reset-aria')
  };
}

function buildHistoryRefreshOptions(t: Translator) {
  return [
    { value: '', label: t('time.range.manual-refresh') },
    { value: '10', label: '10s' },
    { value: '30', label: '30s' },
    { value: '60', label: '1m' },
    { value: '300', label: '5m' }
  ];
}

function buildHistoryTimezoneOptions(t: Translator) {
  return [
    { value: '', label: t('time.range.local-timezone') },
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
    { value: 'UTC', label: 'UTC' }
  ];
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
  favoriteNames = [],
  onToggleFavorite,
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
  favoriteNames?: string[];
  onToggleFavorite?: (item: MonitorHistoryMetricCatalogItem) => Promise<void> | void;
  formatTime: (value?: number | string | null) => string;
  t: Translator;
}) {
  const [zoomRangesByKey, setZoomRangesByKey] = React.useState<Record<string, HzEChartsDataZoomRange | undefined>>({});
  const [previewTimeContext, setPreviewTimeContext] = React.useState<TimeContext | null>(null);
  const [previewApplyTimeContext, setPreviewApplyTimeContext] = React.useState<TimeContext | null>(null);

  const handleChartZoomChange = React.useCallback((key: string, nextZoom: HzEChartsDataZoomRange) => {
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

  React.useEffect(() => {
    setPreviewTimeContext(null);
    setPreviewApplyTimeContext(null);
    setZoomRangesByKey({});
  }, [
    aggregated,
    historyWindow,
    timeContext?.end,
    timeContext?.from,
    timeContext?.live,
    timeContext?.refresh,
    timeContext?.start,
    timeContext?.timeRange,
    timeContext?.tz,
    timeContext?.timezone,
    timeContext?.to
  ]);

  if (items.length === 0) return null;

  const loadingSet = new Set(loadingKeys);
  const fallbackTimeRange = timeWindowToTimeRange(historyWindow || historyWindows[0]?.value);
  const visibleTimeContext = buildVisibleHistoryTimeContext(items, payloads, fallbackTimeRange);
  const toolbarTimeContext = previewTimeContext || {
    ...visibleTimeContext,
    ...timeContext,
    start: timeContext?.start || visibleTimeContext.start,
    end: timeContext?.end || visibleTimeContext.end
  };

  return (
    <div
      className="space-y-2"
      data-monitor-history-chart-visual="shared-timeseries"
      data-monitor-history-axis-policy="sparse-readable"
      data-monitor-history-navigator="echarts-native-slider"
      data-monitor-history-datazoom-state="toolbar-feedback"
      data-monitor-history-datazoom-feedback="time-toolbar"
      data-monitor-history-datazoom-preserve="preserved"
      data-monitor-history-selection-reset="angular-chart-reload"
      data-monitor-history-source="app-yml-metric-catalog"
      data-monitor-history-template-source="monitor-yml"
    >
      {showControls ? (
        <div
          className="space-y-2"
          data-monitor-history-time-toolbar="hertzbeat-ui-time-range-toolbar"
          data-monitor-history-time-toolbar-owner="hertzbeat-ui-time-range-toolbar"
          data-monitor-history-time-toolbar-visual="hertzbeat-ui-metrics-controls"
          data-monitor-history-datazoom-feedback="time-toolbar"
          data-monitor-history-datazoom-preview-state={previewTimeContext ? 'active' : 'idle'}
          data-monitor-history-refresh-contract="angular-first-page-reload"
        >
          <HzTimeRangeToolbar
            value={toolbarTimeContext}
            showAbsoluteFields
            absoluteFieldsLayout="inline"
            absoluteInputMode="datetime-local"
            timeRangePickerMode="single"
            railLayout="nowrap"
            previewSource={previewTimeContext ? 'chart-datazoom' : undefined}
            presets={historyWindows.map(option => ({
              value: timeWindowToTimeRange(option.value) || option.value,
              label: option.label
            }))}
            refreshOptions={buildHistoryRefreshOptions(t)}
            timezoneOptions={buildHistoryTimezoneOptions(t)}
            labels={buildHistoryTimeToolbarLabels(t)}
            onApply={context => {
              setPreviewTimeContext(null);
              setPreviewApplyTimeContext(null);
              setZoomRangesByKey({});
              onHistoryTimeContextApply?.(context);
              const nextWindow = timeRangeToTimeWindow(context.timeRange);
              if (nextWindow) onHistoryWindowChange?.(nextWindow);
            }}
            onRefresh={onRefresh}
            onReset={() => {
              setPreviewTimeContext(null);
              setPreviewApplyTimeContext(null);
              setZoomRangesByKey({});
              const resetContext = buildHistoryResetTimeContext(toolbarTimeContext, fallbackTimeRange);
              onHistoryTimeContextApply?.(resetContext);
              const nextWindow = timeRangeToTimeWindow(resetContext.timeRange);
              if (nextWindow) onHistoryWindowChange?.(nextWindow);
            }}
            presetOptionDataAttribute="data-monitor-history-time-range-option"
            refreshActionProps={{ 'data-monitor-history-refresh-action': 'true' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
          />
          {previewTimeContext ? (
            <HzTimeRangePreviewHandoff
              state="preview"
              source="chart-datazoom"
              from={previewTimeContext.from}
              to={previewTimeContext.to}
              applyLabel={t('monitor.detail.history.zoom.apply')}
              resetLabel={t('time.range.reset')}
              applyDisabled={!previewApplyTimeContext}
              onApply={() => {
                if (!previewApplyTimeContext) return;
                onApplyChartZoomTimeRange?.(previewApplyTimeContext);
                setPreviewTimeContext(null);
                setPreviewApplyTimeContext(null);
                setZoomRangesByKey({});
              }}
              onReset={() => {
                setPreviewTimeContext(null);
                setPreviewApplyTimeContext(null);
                setZoomRangesByKey({});
              }}
              data-monitor-history-datazoom-handoff-owner="hertzbeat-ui-time-range-preview-handoff"
            />
          ) : null}
          {historyModes.length ? (
            <div
              className="min-w-0"
              data-monitor-history-mode-owner="hertzbeat-ui-tabs"
              data-monitor-history-mode-active={aggregated ? 'aggregated' : 'raw'}
            >
              <HzSegmentedTabs
                activeId={String(aggregated)}
                items={historyModes.map(option => ({ id: String(option.value), label: option.label }))}
                onSelect={value => onHistoryModeChange?.(value === 'true')}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <HzMonitorHistoryChartGrid data-monitor-history-chart-grid-use="monitor-detail-page">
        {items.map(item => {
          const key = historyMetricKey(item);
          const title = historyMetricTitle(item);
          const selected = selectedKey === key;
          const values = pickPrimaryHistorySeries(payloads[key]);
          const hasHistorySeries = values.length > 0;
          const loading = loadingSet.has(key);
          const error = errors[key];
          const favorited = Boolean(resolveHistoryFavoriteToken(item, favoriteNames));
          const zoomApplyContext = buildHistoryDataZoomApplyTimeContext(
            values,
            zoomRangesByKey[key],
            timeContext,
            timeWindowToTimeRange(historyWindow)
          );
          const canApplyZoom = Boolean(
            zoomApplyContext &&
            onApplyChartZoomTimeRange &&
            !isSameTimeContextRange(zoomApplyContext, timeContext)
          );
          const option = buildHistoryChartEChartsOption({
            values,
            formatTime,
            aggregated,
            visibleSeriesKeys: aggregated ? ['mean', 'min', 'max'] : ['origin']
          });

          return (
            <HzMonitorHistoryChartCard
              key={key}
              cardKey={key}
              heading={title}
              unit={item.unit || undefined}
              selected={selected}
              footer={hasHistorySeries ? `${values.length} ${t('monitor.detail.history-series.search.count')}` : '-'}
              option={hasHistorySeries ? option : undefined}
              height={360}
              loading={loading}
              loadingLabel={t('common.loading')}
              error={error}
              actions={onToggleFavorite ? (
                <HzMonitorMetricFavoriteAction
                  active={favorited}
                  label={favorited ? t('monitor.detail.favorite.remove') : t('monitor.detail.favorite.add')}
                  onClick={event => {
                    event.stopPropagation();
                    void onToggleFavorite(item);
                  }}
                  data-monitor-history-card-action="favorite"
                  data-monitor-history-card-action-owner="hertzbeat-ui-favorite-action"
                />
              ) : null}
              emptyTitle={t('monitor.detail.history.blocker.title')}
              emptyDescription={t('monitor.detail.history.blocker.copy')}
              zoomActionLabel={onApplyChartZoomTimeRange ? t('monitor.detail.history.zoom.apply') : undefined}
              zoomActionDisabled={!canApplyZoom}
              zoomActionProps={{
                'data-monitor-history-zoom-apply': 'local-to-query-time',
                'data-monitor-history-zoom-apply-state': canApplyZoom ? 'ready' : 'idle',
                'data-monitor-history-zoom-apply-url-model': 'expression-from-to',
                'data-monitor-history-zoom-apply-from': zoomApplyContext?.from,
                'data-monitor-history-zoom-apply-to': zoomApplyContext?.to
              } as React.ButtonHTMLAttributes<HTMLButtonElement>}
              onZoomAction={() => {
                if (!zoomApplyContext) return;
                onApplyChartZoomTimeRange?.(zoomApplyContext);
                setPreviewTimeContext(null);
                setPreviewApplyTimeContext(null);
                setZoomRangesByKey(current => ({ ...current, [key]: undefined }));
              }}
              preserveDataZoom
              surfaceProps={{
                'data-monitor-history-panel': key,
                'data-monitor-history-panel-source': 'app-yml-metric-catalog',
                'data-monitor-history-panel-state': hasHistorySeries ? 'series-ready' : 'history-store-empty',
                'data-monitor-history-panel-metric': title,
                'data-monitor-history-panel-unit': item.unit || undefined
              } as React.ComponentProps<typeof HzMonitorHistoryChartCard>['surfaceProps']}
              onDataZoomChange={nextZoom => {
                handleChartZoomChange(key, nextZoom);
                const nextContext = buildHistoryDataZoomPreviewTimeContext(
                  values,
                  nextZoom,
                  timeContext,
                  timeWindowToTimeRange(historyWindow)
                );
                const nextApplyContext = buildHistoryDataZoomApplyTimeContext(
                  values,
                  nextZoom,
                  timeContext,
                  timeWindowToTimeRange(historyWindow)
                );
                setPreviewTimeContext(nextContext);
                setPreviewApplyTimeContext(nextApplyContext);
              }}
              onSelect={() => onSelectMetric(key)}
            />
          );
        })}
      </HzMonitorHistoryChartGrid>
    </div>
  );
}
