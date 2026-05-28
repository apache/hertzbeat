'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HzActionGroup,
  HzButton,
  HzDataMetaText,
  HzEChartsPanel,
  HzInlineFeedback,
  HzMonitorControlBand,
  HzMonitorDetailStage,
  HzMonitorEvidenceFrame,
  HzMonitorFullscreenFrame,
  HzMonitorRowNavigator,
  HzUnderlineToggle,
  HzDetailRows,
  HzSelectableRows
} from '@hertzbeat/ui';
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
    <HzSelectableRows
      heading={t('monitor.detail.history-points.title')}
      rows={rows}
      selectedKey={selectedPointIndex == null ? null : String(selectedPointIndex)}
      selectionAttrName="data-selected"
      onSelect={key => onSelectPoint(Number(key))}
      data-monitor-history-selectable-owner="hertzbeat-ui-selectable-rows"
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
    <HzSelectableRows
      heading={t('monitor.detail.history-series.samples.title')}
      rows={visibleRows}
      selectedKey={selectedSeriesKey}
      selectionAttrName="data-series-selected"
      onSelect={onSelectSeries}
      data-monitor-history-selectable-owner="hertzbeat-ui-selectable-rows"
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
    return (
      <HzSelectableRows
        rows={rows}
        selectedKey={null}
        selectable={false}
        data-monitor-history-compare-owner="hertzbeat-ui-selectable-rows"
      />
    );
  }

  return (
    <HzSelectableRows
      rows={visibleRows}
      selectedKey={selectedSeriesKey}
      selectionAttrName="data-compare-row-selected"
      onSelect={onSelectSeries}
      data-monitor-history-compare-owner="hertzbeat-ui-selectable-rows"
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
    <HzMonitorDetailStage
      title={t('monitor.detail.tab.history')}
      header="hidden"
      rhythm="stack"
      data-monitor-surface="history-stage"
      data-monitor-history-stage-owner="hertzbeat-ui-detail-stage"
      data-monitor-history-selection-reset="angular-chart-reload"
    >
      {values.length > 0 ? (
        <HzMonitorEvidenceFrame data-monitor-history-chart-frame-owner="hertzbeat-ui-evidence-frame">
          {aggregated && chartSeriesKeys.length > 1 ? (
            <HzMonitorControlBand
              title={t('monitor.detail.history-chart.scope.title')}
              actions={
                <>
                  <HzButton
                    size="sm"
                    intent="ghost"
                    data-monitor-history-control-owner="hertzbeat-ui-button"
                    disabled={!canFocusPrimarySeries}
                    onClick={() => setActiveChartSeriesKeys(['mean'])}
                  >
                    {t('monitor.detail.history-chart.scope.primary-only')}
                  </HzButton>
                  <HzButton
                    size="sm"
                    intent="ghost"
                    data-monitor-history-control-owner="hertzbeat-ui-button"
                    disabled={!canShowAllChartStats}
                    onClick={() => setActiveChartSeriesKeys(chartSeriesKeys)}
                  >
                    {t('monitor.detail.history-chart.scope.all')}
                  </HzButton>
                </>
              }
              variant="embedded"
              data-monitor-history-chart-band-owner="hertzbeat-ui-control-band"
            >
              {chartSeriesKeys.map(key => {
                const selected = activeChartSeriesKeys.includes(key);
                const title = key === 'origin' ? 'Value' : key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <HzUnderlineToggle
                    key={key}
                    selected={selected}
                    selectionAttrName="data-chart-selected"
                    data-monitor-history-toggle-owner="hertzbeat-ui-underline-toggle"
                    onClick={() => setActiveChartSeriesKeys(currentKeys => toggleMonitorHistoryVisibleSeriesKey(currentKeys, key, chartSeriesKeys))}
                  >
                    <span>{title}</span>
                  </HzUnderlineToggle>
                );
              })}
            </HzMonitorControlBand>
          ) : null}
          <HzEChartsPanel
            option={historyChartOption}
            height={260}
            onChartClick={index => onSelectPoint(index)}
            tone="operator"
            data-monitor-history-chart-owner="hertzbeat-ui-echarts-panel"
          />
          <MonitorStatGrid
            items={[
              { label: t('monitor.detail.history.stats.latest'), value: latestValue },
              { label: t('monitor.detail.history.stats.delta'), value: deltaValue },
              { label: t('monitor.detail.history.stats.range'), value: rangeValue }
            ]}
          />
        </HzMonitorEvidenceFrame>
      ) : null}
      <HzActionGroup
        density="inline"
        layout="split"
        data-monitor-history-action-owner="hertzbeat-ui-action-group"
        data-monitor-history-action="history-toolbar"
      >
        <HzActionGroup
          density="inline"
          data-monitor-history-action-owner="hertzbeat-ui-action-group"
          data-monitor-history-action="history-range-mode"
        >
          {historyWindows.map(option => (
            <HzUnderlineToggle
              key={option.value}
              selected={historyWindow === option.value}
              data-monitor-history-toggle-owner="hertzbeat-ui-underline-toggle"
              onClick={() => onSetHistoryWindow(option.value)}
            >
              {option.label}
            </HzUnderlineToggle>
          ))}
          {historyModes.map(option => (
            <HzUnderlineToggle
              key={option.label}
              selected={aggregated === option.value}
              data-monitor-history-toggle-owner="hertzbeat-ui-underline-toggle"
              onClick={() => onSetHistoryMode(option.value)}
            >
              {option.label}
            </HzUnderlineToggle>
          ))}
        </HzActionGroup>
        <HzActionGroup
          density="inline"
          data-monitor-history-action-owner="hertzbeat-ui-action-group"
          data-monitor-history-action="history-actions"
        >
          {values.length > 0 ? (
            <HzButton size="sm" intent="ghost" data-monitor-history-control-owner="hertzbeat-ui-button" onClick={() => onSelectPoint(values.length - 1)}>
              {t('monitor.detail.history.latest-point')}
            </HzButton>
          ) : null}
          <HzButton size="sm" intent="ghost" data-monitor-history-control-owner="hertzbeat-ui-button" onClick={onRefresh}>{t('common.refresh')}</HzButton>
          {showExpandControl ? (
            <HzButton size="sm" intent="ghost" data-monitor-history-control-owner="hertzbeat-ui-button" onClick={onToggleExpanded}>
              {t('monitor.detail.history.fullscreen.enter')}
            </HzButton>
          ) : null}
        </HzActionGroup>
      </HzActionGroup>
      {payload && !hasPersistedSeriesData ? (
        <HzInlineFeedback
          tone="warning"
          title={t('monitor.detail.history.blocker.title')}
          description={t('monitor.detail.history.blocker.copy')}
          data-monitor-history-feedback-owner="hertzbeat-ui-inline-feedback"
        />
      ) : null}
      {seriesNavigation.total > 0 ? (
        <HzMonitorRowNavigator
          label={
            seriesNavigation.selectedIndex != null
              ? `${t('monitor.detail.history-series.label')} ${seriesNavigation.selectedIndex + 1} / ${seriesNavigation.total}${
                  seriesNavigation.selectedLabel ? ` · ${seriesNavigation.selectedLabel}` : ''
                }`
              : t('monitor.detail.history-series.empty.copy')
          }
          previousLabel={t('common.previous-series')}
          nextLabel={t('common.next-series')}
          canPrevious={seriesNavigation.canPrevious}
          canNext={seriesNavigation.canNext}
          onPrevious={() => {
            if (seriesNavigation.selectedIndex == null || !seriesNavigation.canPrevious) return;
            onSelectSeries(seriesKeys[seriesNavigation.selectedIndex - 1] || selectedSeriesKey || '');
          }}
          onNext={() => {
            if (seriesNavigation.selectedIndex == null || !seriesNavigation.canNext) return;
            onSelectSeries(seriesKeys[seriesNavigation.selectedIndex + 1] || selectedSeriesKey || '');
          }}
          data-monitor-history-row-nav-owner="hertzbeat-ui-row-navigator"
        />
      ) : null}
      {pointNavigation.total > 0 ? (
        <HzMonitorRowNavigator
          label={
            pointNavigation.selectedIndex != null
              ? `${t('monitor.detail.history-point.label')} ${pointNavigation.selectedIndex + 1} / ${pointNavigation.total}${
                  pointNavigation.selectedLabel ? ` · ${pointNavigation.selectedLabel}` : ''
                }`
              : t('monitor.detail.history-selected.empty.copy')
          }
          previousLabel={t('common.previous-point')}
          nextLabel={t('common.next-point')}
          canPrevious={pointNavigation.canPrevious}
          canNext={pointNavigation.canNext}
          onPrevious={() => {
            if (pointNavigation.selectedIndex == null || !pointNavigation.canPrevious) return;
            onSelectPoint(pointNavigation.selectedIndex - 1);
          }}
          onNext={() => {
            if (pointNavigation.selectedIndex == null || !pointNavigation.canNext) return;
            onSelectPoint(pointNavigation.selectedIndex + 1);
          }}
          data-monitor-history-row-nav-owner="hertzbeat-ui-row-navigator"
        />
      ) : null}
      <SelectableSeriesRows rows={seriesRows} selectedSeriesKey={activeSelectedSeriesKey} onSelectSeries={onSelectSeries} t={t} />
      <HzDetailRows rows={summaryRows} data-monitor-history-summary-owner="hertzbeat-ui-detail-rows" />
      <SelectablePointRows rows={pointRows.slice(0, 5)} selectedPointIndex={selectedPointIndex} onSelectPoint={onSelectPoint} t={t} />
      <HzDetailRows rows={selectedPointRows} data-monitor-history-selected-point-owner="hertzbeat-ui-detail-rows" />
      {availableSeriesKeys.length > 1 ? (
        <HzMonitorControlBand
          title={t('monitor.detail.history-compare.scope.title')}
          actions={
            <>
              <HzButton
                size="sm"
                intent="ghost"
                data-monitor-history-control-owner="hertzbeat-ui-button"
                disabled={!activeSelectedSeriesKey}
                onClick={() => activeSelectedSeriesKey && setActiveCompareSeriesKeys([activeSelectedSeriesKey])}
              >
                {t('monitor.detail.history-compare.scope.selected-only')}
              </HzButton>
              <HzButton
                size="sm"
                intent="ghost"
                data-monitor-history-control-owner="hertzbeat-ui-button"
                onClick={() => setActiveCompareSeriesKeys(availableSeriesKeys)}
              >
                {t('monitor.detail.history-compare.scope.all')}
              </HzButton>
            </>
          }
          data-monitor-history-compare-band-owner="hertzbeat-ui-control-band"
        >
          {seriesRows
            .filter(row => row.key !== 'empty' && availableSeriesKeys.includes(row.key))
            .map(row => {
              const selected = activeCompareSeriesKeys.includes(row.key);
              const locked = activeSelectedSeriesKey === row.key;
              return (
                <HzUnderlineToggle
                  key={row.key}
                  selected={selected}
                  disabled={locked}
                  selectionAttrName="data-compare-selected"
                  data-monitor-history-toggle-owner="hertzbeat-ui-underline-toggle"
                  onClick={() =>
                    !locked &&
                    setActiveCompareSeriesKeys(currentKeys => toggleMonitorHistoryVisibleSeriesKey(currentKeys, row.key, availableSeriesKeys))
                  }
                >
                  <span>{row.title}</span>
                  <HzDataMetaText
                    className="normal-case tracking-normal"
                    data-monitor-history-compare-meta-owner="hertzbeat-ui-data-meta-text"
                  >
                    {row.copy}
                  </HzDataMetaText>
                </HzUnderlineToggle>
              );
            })}
        </HzMonitorControlBand>
      ) : null}
      <SelectableCompareRows rows={compareRows} selectedSeriesKey={activeSelectedSeriesKey} onSelectSeries={onSelectSeries} />
    </HzMonitorDetailStage>
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
        <HzMonitorFullscreenFrame
          ref={dialogRef}
          data-expanded="true"
          title={t('monitor.detail.history.fullscreen.title')}
          kicker={t('monitor.detail.history.fullscreen.kicker')}
          closeLabel={t('monitor.detail.history.fullscreen.exit')}
          onClose={onToggleExpanded}
          data-monitor-history-fullscreen-owner="hertzbeat-ui-fullscreen-frame"
        >
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
        </HzMonitorFullscreenFrame>
      ) : null}
    </>
  );
}
