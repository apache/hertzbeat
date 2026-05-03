'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EChartsPanel } from '../observability/echarts-panel';
import {
  ObservabilityChipToggle,
  ObservabilityControlButton,
  ObservabilityDetailRows,
  ObservabilitySelectableRows,
  ObservabilitySelectableRowsOrDetails
} from '../observability';
import { buildHistoryChartEChartsOption } from '../../lib/monitor-detail/history-chart';
import {
  buildMonitorHistoryPointNavigation,
  buildMonitorHistoryPointCompareRows,
  buildMonitorHistoryPointEvidenceRows,
  buildMonitorHistorySelectedPointRows,
  buildMonitorHistorySeriesNavigation,
  buildMonitorHistorySeriesSelectorRows,
  buildMonitorHistorySeriesSummaryRows,
  resolveMonitorHistoryVisibleSeriesKeys,
  toggleMonitorHistoryVisibleSeriesKey
} from '../../lib/monitor-detail/view-model';
import type { MonitorHistoryData } from '../../lib/types';
import { MonitorStatGrid } from './monitor-panel-primitives';
import { WorkbenchFullscreenShell } from '../workbench/primitives';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function SelectablePointRows({
  rows,
  selectedPointIndex,
  onSelectPoint,
  t
}: {
  rows: Array<{ key: string; title: string; copy: string; meta: string }>;
  selectedPointIndex: number | null;
  onSelectPoint: (index: number) => void;
  t: Translator;
}) {
  if (rows.length === 0) return null;

  return (
    <ObservabilitySelectableRows
      heading={t('monitor.detail.history-points.title')}
      rows={rows}
      selectedKey={selectedPointIndex == null ? null : String(selectedPointIndex)}
      selectionAttrName="data-selected"
      onSelect={key => onSelectPoint(Number(key))}
      tone="operator"
    />
  );
}

function SelectableSeriesRows({
  rows,
  selectedSeriesKey,
  onSelectSeries,
  t
}: {
  rows: Array<{ key: string; title: string; copy: string; meta: string }>;
  selectedSeriesKey: string | null;
  onSelectSeries: (key: string) => void;
  t: Translator;
}) {
  const visibleRows = rows.filter(row => row.key !== 'empty');
  if (visibleRows.length === 0) return null;

  return (
    <ObservabilitySelectableRows
      heading={t('monitor.detail.history-series.samples.title')}
      rows={visibleRows}
      selectedKey={selectedSeriesKey}
      selectionAttrName="data-series-selected"
      onSelect={onSelectSeries}
      tone="operator"
    />
  );
}

function SelectableCompareRows({
  rows,
  selectedSeriesKey,
  onSelectSeries
}: {
  rows: Array<{ key: string; title: string; copy: string; meta: string }>;
  selectedSeriesKey: string | null;
  onSelectSeries: (key: string) => void;
}) {
  const visibleRows = rows.filter(row => row.key !== 'empty');
  if (visibleRows.length === 0) {
    return <ObservabilityDetailRows tone="operator" rows={rows} />;
  }

  return (
    <ObservabilitySelectableRowsOrDetails
      rows={visibleRows}
      selectedKey={selectedSeriesKey}
      selectionAttrName="data-compare-row-selected"
      onSelect={onSelectSeries}
      tone="operator"
    />
  );
}

function Surface({
  payload,
  selectedSeriesKey,
  selectedPointIndex,
  aggregated,
  historyWindow,
  historyWindows,
  historyModes,
  visibleSeriesKeys,
  showExpandControl = true,
  onSelectSeries,
  onSelectPoint,
  onRefresh,
  onSetHistoryWindow,
  onSetHistoryMode,
  onToggleExpanded,
  formatTime,
  t
}: {
  payload: MonitorHistoryData | null | undefined;
  selectedSeriesKey: string | null;
  selectedPointIndex: number | null;
  aggregated: boolean;
  historyWindow: string;
  historyWindows: Array<{ value: string; label: string }>;
  historyModes: Array<{ value: boolean; label: string }>;
  visibleSeriesKeys: string[];
  showExpandControl?: boolean;
  onSelectSeries: (key: string) => void;
  onSelectPoint: (index: number) => void;
  onRefresh: () => void;
  onSetHistoryWindow: (value: string) => void;
  onSetHistoryMode: (value: boolean) => void;
  onToggleExpanded: () => void;
  formatTime: (value?: number | string | null) => string;
  t: Translator;
}) {
  const availableSeriesKeys = visibleSeriesKeys;
  const chartSeriesKeys = useMemo(() => (aggregated ? ['mean', 'min', 'max'] : ['origin']), [aggregated]);
  const [activeCompareSeriesKeys, setActiveCompareSeriesKeys] = useState<string[]>(availableSeriesKeys);
  const [activeChartSeriesKeys, setActiveChartSeriesKeys] = useState<string[]>(chartSeriesKeys);
  const canFocusPrimarySeries = aggregated && activeChartSeriesKeys.length !== 1;
  const canShowAllChartStats = aggregated && activeChartSeriesKeys.length !== chartSeriesKeys.length;

  useEffect(() => {
    setActiveCompareSeriesKeys(currentKeys => resolveMonitorHistoryVisibleSeriesKeys(currentKeys, availableSeriesKeys));
  }, [availableSeriesKeys]);

  useEffect(() => {
    setActiveChartSeriesKeys(currentKeys => resolveMonitorHistoryVisibleSeriesKeys(currentKeys, chartSeriesKeys));
  }, [chartSeriesKeys]);

  const activeSelectedSeriesKey =
    selectedSeriesKey && availableSeriesKeys.includes(selectedSeriesKey) ? selectedSeriesKey : availableSeriesKeys[0] ?? null;

  useEffect(() => {
    if (!activeSelectedSeriesKey) return;
    setActiveCompareSeriesKeys(currentKeys => (currentKeys.includes(activeSelectedSeriesKey) ? currentKeys : [activeSelectedSeriesKey, ...currentKeys]));
  }, [activeSelectedSeriesKey, availableSeriesKeys]);

  const values = useMemo(() => (activeSelectedSeriesKey ? payload?.values?.[activeSelectedSeriesKey] || [] : []), [activeSelectedSeriesKey, payload]);
  const summaryRows = buildMonitorHistorySeriesSummaryRows(payload, activeSelectedSeriesKey, t, formatTime, aggregated);
  const seriesRows = buildMonitorHistorySeriesSelectorRows(payload, t, formatTime, aggregated).filter(
    row => row.key === 'empty' || availableSeriesKeys.includes(row.key)
  );
  const pointRows = buildMonitorHistoryPointEvidenceRows(payload, activeSelectedSeriesKey, t, formatTime, aggregated);
  const selectedPointRows = buildMonitorHistorySelectedPointRows(payload, activeSelectedSeriesKey, selectedPointIndex, t, formatTime, aggregated);
  const compareRows = buildMonitorHistoryPointCompareRows(
    payload,
    activeCompareSeriesKeys,
    selectedPointIndex,
    activeSelectedSeriesKey,
    t,
    formatTime,
    aggregated
  );
  const seriesKeys = availableSeriesKeys;
  const hasPersistedSeriesData = seriesKeys.some(key => (payload?.values?.[key] || []).length > 0);
  const seriesNavigation = buildMonitorHistorySeriesNavigation(payload, activeSelectedSeriesKey, availableSeriesKeys);
  const pointNavigation = buildMonitorHistoryPointNavigation(payload, activeSelectedSeriesKey, selectedPointIndex, formatTime);
  const historyChartOption = useMemo(
    () =>
      buildHistoryChartEChartsOption({
        values,
        formatTime,
        aggregated,
        selectedPointIndex,
        visibleSeriesKeys: activeChartSeriesKeys,
        enableDataZoom: false
      }),
    [activeChartSeriesKeys, aggregated, formatTime, selectedPointIndex, values]
  );
  const latestPoint = values[values.length - 1];
  const previousPoint = values.length > 1 ? values[values.length - 2] : null;
  const primaryKey = aggregated ? 'mean' : 'origin';
  const latestRaw = latestPoint ? latestPoint[primaryKey] ?? (primaryKey === 'mean' ? latestPoint.origin : latestPoint.mean) ?? null : null;
  const previousRaw = previousPoint ? previousPoint[primaryKey] ?? (primaryKey === 'mean' ? previousPoint.origin : previousPoint.mean) ?? null : null;
  const latestNumeric = latestRaw == null || latestRaw === '' ? null : Number(latestRaw);
  const previousNumeric = previousRaw == null || previousRaw === '' ? null : Number(previousRaw);
  const numericSeries = values
    .map(value => Number(value[primaryKey] ?? value.origin ?? value.mean ?? NaN))
    .filter(value => Number.isFinite(value));
  const deltaValue =
    latestNumeric != null && Number.isFinite(latestNumeric) && previousNumeric != null && Number.isFinite(previousNumeric)
      ? `${latestNumeric - previousNumeric > 0 ? '+' : ''}${(latestNumeric - previousNumeric).toFixed(2)}`
      : '-';
  const rangeValue =
    numericSeries.length > 0 ? `${Math.min(...numericSeries).toFixed(2)} - ${Math.max(...numericSeries).toFixed(2)}` : '-';
  const latestValue = latestRaw == null || latestRaw === '' ? '-' : String(latestRaw);

  return (
    <div className="space-y-3" data-monitor-surface="history-stage">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ops-border-color)] pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('monitor.detail.history.stage.title')}</div>
          <div className="mt-1 max-w-2xl text-sm text-[var(--ops-text-secondary)]">
            {t('monitor.detail.history.stage.copy')}
          </div>
        </div>
        <div className="border-l border-[var(--ops-border-color)] pl-3 text-right" data-monitor-surface-panel="series-compare">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">
            Selected series
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--ops-text-primary)]">
            {activeSelectedSeriesKey || t('monitor.detail.history.compare.empty')}
          </div>
        </div>
      </div>

      {values.length > 0 ? (
        <div className="space-y-3 border-y border-[var(--ops-border-color)] py-3">
          {aggregated && chartSeriesKeys.length > 1 ? (
            <div className="space-y-2 border-y border-[var(--ops-border-color)] px-0 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('monitor.detail.history-chart.scope.title')}</div>
                <div className="flex flex-wrap gap-2">
                  <ObservabilityControlButton
                    tone="operator"
                    disabled={!canFocusPrimarySeries}
                    onClick={() => setActiveChartSeriesKeys(['mean'])}
                  >
                    {t('monitor.detail.history-chart.scope.primary-only')}
                  </ObservabilityControlButton>
                  <ObservabilityControlButton
                    tone="operator"
                    disabled={!canShowAllChartStats}
                    onClick={() => setActiveChartSeriesKeys(chartSeriesKeys)}
                  >
                    {t('monitor.detail.history-chart.scope.all')}
                  </ObservabilityControlButton>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {chartSeriesKeys.map(key => {
                  const selected = activeChartSeriesKeys.includes(key);
                  const title = key === 'origin' ? 'Value' : key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <ObservabilityChipToggle
                      key={key}
                      tone="operator"
                      selected={selected}
                      selectionAttrName="data-chart-selected"
                      onClick={() => setActiveChartSeriesKeys(currentKeys => toggleMonitorHistoryVisibleSeriesKey(currentKeys, key, chartSeriesKeys))}
                    >
                      <span>{title}</span>
                    </ObservabilityChipToggle>
                  );
                })}
              </div>
            </div>
          ) : null}
          <EChartsPanel
            option={historyChartOption}
            height={260}
            className="rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]"
            onChartClick={index => onSelectPoint(index)}
            tone="operator"
          />
          <MonitorStatGrid
            items={[
              { label: t('monitor.detail.history.stats.latest'), value: latestValue },
              { label: t('monitor.detail.history.stats.delta'), value: deltaValue },
              { label: t('monitor.detail.history.stats.range'), value: rangeValue }
            ]}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {historyWindows.map(option => (
            <ObservabilityChipToggle
              key={option.value}
              tone="operator"
              selected={historyWindow === option.value}
              onClick={() => onSetHistoryWindow(option.value)}
            >
              {option.label}
            </ObservabilityChipToggle>
          ))}
          {historyModes.map(option => (
            <ObservabilityChipToggle
              key={option.label}
              tone="operator"
              selected={aggregated === option.value}
              onClick={() => onSetHistoryMode(option.value)}
            >
              {option.label}
            </ObservabilityChipToggle>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {values.length > 0 ? (
            <ObservabilityControlButton tone="operator" onClick={() => onSelectPoint(values.length - 1)}>
              {t('monitor.detail.history.latest-point')}
            </ObservabilityControlButton>
          ) : null}
          <ObservabilityControlButton tone="operator" onClick={onRefresh}>{t('common.refresh')}</ObservabilityControlButton>
          {showExpandControl ? (
            <ObservabilityControlButton tone="operator" onClick={onToggleExpanded}>
              {t('monitor.detail.history.fullscreen.enter')}
            </ObservabilityControlButton>
          ) : null}
        </div>
      </div>
      {payload && !hasPersistedSeriesData ? (
        <div className="border-y border-amber-300/16 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-50/92">
          <div className="font-medium">{t('monitor.detail.history.blocker.title')}</div>
          <div className="mt-1 text-amber-100/80">
            {t('monitor.detail.history.blocker.copy')}
          </div>
        </div>
      ) : null}
      {seriesNavigation.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[var(--ops-border-color)] px-3 py-2 text-xs text-[var(--ops-text-secondary)]">
          <div>
            {seriesNavigation.selectedIndex != null
              ? `${t('monitor.detail.history-series.label')} ${seriesNavigation.selectedIndex + 1} / ${seriesNavigation.total}${
                  seriesNavigation.selectedLabel ? ` · ${seriesNavigation.selectedLabel}` : ''
                }`
              : t('monitor.detail.history-series.empty.copy')}
          </div>
          <div className="flex flex-wrap gap-2">
            <ObservabilityControlButton
              tone="operator"
              disabled={!seriesNavigation.canPrevious}
              onClick={() => {
                if (seriesNavigation.selectedIndex == null || !seriesNavigation.canPrevious) return;
                onSelectSeries(seriesKeys[seriesNavigation.selectedIndex - 1] || selectedSeriesKey || '');
              }}
            >
              {t('common.previous-series')}
            </ObservabilityControlButton>
            <ObservabilityControlButton
              tone="operator"
              disabled={!seriesNavigation.canNext}
              onClick={() => {
                if (seriesNavigation.selectedIndex == null || !seriesNavigation.canNext) return;
                onSelectSeries(seriesKeys[seriesNavigation.selectedIndex + 1] || selectedSeriesKey || '');
              }}
            >
              {t('common.next-series')}
            </ObservabilityControlButton>
          </div>
        </div>
      ) : null}
      {pointNavigation.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[var(--ops-border-color)] px-3 py-2 text-xs text-[var(--ops-text-secondary)]">
          <div>
            {pointNavigation.selectedIndex != null
              ? `${t('monitor.detail.history-point.label')} ${pointNavigation.selectedIndex + 1} / ${pointNavigation.total}${
                  pointNavigation.selectedLabel ? ` · ${pointNavigation.selectedLabel}` : ''
                }`
              : t('monitor.detail.history-selected.empty.copy')}
          </div>
          <div className="flex flex-wrap gap-2">
            <ObservabilityControlButton
              tone="operator"
              disabled={!pointNavigation.canPrevious}
              onClick={() => {
                if (pointNavigation.selectedIndex == null || !pointNavigation.canPrevious) return;
                onSelectPoint(pointNavigation.selectedIndex - 1);
              }}
            >
              {t('common.previous-point')}
            </ObservabilityControlButton>
            <ObservabilityControlButton
              tone="operator"
              disabled={!pointNavigation.canNext}
              onClick={() => {
                if (pointNavigation.selectedIndex == null || !pointNavigation.canNext) return;
                onSelectPoint(pointNavigation.selectedIndex + 1);
              }}
            >
              {t('common.next-point')}
            </ObservabilityControlButton>
          </div>
        </div>
      ) : null}
      <SelectableSeriesRows rows={seriesRows} selectedSeriesKey={activeSelectedSeriesKey} onSelectSeries={onSelectSeries} t={t} />
      <ObservabilityDetailRows tone="operator" rows={summaryRows} />
      <SelectablePointRows rows={pointRows.slice(0, 5)} selectedPointIndex={selectedPointIndex} onSelectPoint={onSelectPoint} t={t} />
      <ObservabilityDetailRows tone="operator" rows={selectedPointRows} />
      {availableSeriesKeys.length > 1 ? (
        <div className="space-y-2 border-y border-[var(--ops-border-color)] px-3 py-2" data-monitor-surface-panel="series-compare">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('monitor.detail.history-compare.scope.title')}</div>
            <div className="flex flex-wrap gap-2">
              <ObservabilityControlButton
                tone="operator"
                disabled={!activeSelectedSeriesKey}
                onClick={() => activeSelectedSeriesKey && setActiveCompareSeriesKeys([activeSelectedSeriesKey])}
              >
                {t('monitor.detail.history-compare.scope.selected-only')}
              </ObservabilityControlButton>
              <ObservabilityControlButton tone="operator" onClick={() => setActiveCompareSeriesKeys(availableSeriesKeys)}>
                {t('monitor.detail.history-compare.scope.all')}
              </ObservabilityControlButton>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {seriesRows
              .filter(row => row.key !== 'empty' && availableSeriesKeys.includes(row.key))
              .map(row => {
                const selected = activeCompareSeriesKeys.includes(row.key);
                const locked = activeSelectedSeriesKey === row.key;
                return (
                  <ObservabilityChipToggle
                    key={row.key}
                    tone="operator"
                    selected={selected}
                    disabled={locked}
                    selectionAttrName="data-compare-selected"
                    onClick={() =>
                      !locked &&
                      setActiveCompareSeriesKeys(currentKeys =>
                        toggleMonitorHistoryVisibleSeriesKey(currentKeys, row.key, availableSeriesKeys)
                      )
                    }
                  >
                    <span>{row.title}</span>
                    <span className="text-[var(--ops-text-tertiary)]">{row.copy}</span>
                  </ObservabilityChipToggle>
                );
              })}
          </div>
        </div>
      ) : null}
      <SelectableCompareRows rows={compareRows} selectedSeriesKey={activeSelectedSeriesKey} onSelectSeries={onSelectSeries} />
    </div>
  );
}

export function MonitorHistoryPanel({
  payload,
  selectedSeriesKey,
  selectedPointIndex,
  aggregated,
  historyWindow,
  historyWindows,
  historyModes,
  visibleSeriesKeys,
  expanded,
  onSelectSeries,
  onSelectPoint,
  onRefresh,
  onSetHistoryWindow,
  onSetHistoryMode,
  onToggleExpanded,
  formatTime,
  t
}: {
  payload: MonitorHistoryData | null | undefined;
  selectedSeriesKey: string | null;
  selectedPointIndex: number | null;
  aggregated: boolean;
  historyWindow: string;
  historyWindows: Array<{ value: string; label: string }>;
  historyModes: Array<{ value: boolean; label: string }>;
  visibleSeriesKeys: string[];
  expanded: boolean;
  onSelectSeries: (key: string) => void;
  onSelectPoint: (index: number) => void;
  onRefresh: () => void;
  onSetHistoryWindow: (value: string) => void;
  onSetHistoryMode: (value: boolean) => void;
  onToggleExpanded: () => void;
  formatTime: (value?: number | string | null) => string;
  t: Translator;
}) {
  void onSelectSeries;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onToggleExpanded();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus?.();
    };
  }, [expanded, onToggleExpanded]);

  return (
    <>
      <Surface
        payload={payload}
        selectedSeriesKey={selectedSeriesKey}
        selectedPointIndex={selectedPointIndex}
        aggregated={aggregated}
        historyWindow={historyWindow}
        historyWindows={historyWindows}
        historyModes={historyModes}
        visibleSeriesKeys={visibleSeriesKeys}
        onSelectSeries={onSelectSeries}
        onSelectPoint={onSelectPoint}
        onRefresh={onRefresh}
        onSetHistoryWindow={onSetHistoryWindow}
        onSetHistoryMode={onSetHistoryMode}
        onToggleExpanded={onToggleExpanded}
        formatTime={formatTime}
        t={t}
      />
      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,7,10,0.88)] p-4"
          data-expanded="true"
          role="dialog"
          aria-modal="true"
          aria-label={t('monitor.detail.history.fullscreen.title')}
        >
          <WorkbenchFullscreenShell
            ref={dialogRef}
            tabIndex={-1}
            className="hb-scrollbar max-h-[92vh] w-full max-w-6xl overflow-auto"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('monitor.detail.history.fullscreen.kicker')}</div>
                <div className="mt-1 text-lg font-semibold text-[var(--ops-text-primary)]">{t('monitor.detail.history.fullscreen.title')}</div>
              </div>
              <ObservabilityControlButton tone="operator" onClick={onToggleExpanded}>
                {t('monitor.detail.history.fullscreen.exit')}
              </ObservabilityControlButton>
            </div>
            <Surface
              payload={payload}
              selectedSeriesKey={selectedSeriesKey}
              selectedPointIndex={selectedPointIndex}
              aggregated={aggregated}
              historyWindow={historyWindow}
              historyWindows={historyWindows}
              historyModes={historyModes}
              visibleSeriesKeys={visibleSeriesKeys}
              showExpandControl={false}
              onSelectSeries={onSelectSeries}
              onSelectPoint={onSelectPoint}
              onRefresh={onRefresh}
              onSetHistoryWindow={onSetHistoryWindow}
              onSetHistoryMode={onSetHistoryMode}
              onToggleExpanded={onToggleExpanded}
              formatTime={formatTime}
              t={t}
            />
          </WorkbenchFullscreenShell>
        </div>
      ) : null}
    </>
  );
}
