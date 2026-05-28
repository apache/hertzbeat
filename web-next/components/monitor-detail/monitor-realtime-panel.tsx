'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HzButton,
  HzControlStack,
  HzDataMetaText,
  HzInlineFeedback,
  HzInput,
  HzMonitorDetailStage,
  HzMonitorFullscreenFrame,
  HzMonitorRealtimeInspector,
  HzMonitorRealtimeRowNavigator,
  HzMonitorRealtimeToolbar
} from '@hertzbeat/ui';
import {
  buildMonitorMetricRealtimeFactRows,
  buildMonitorMetricSelectedRowRows,
  buildMonitorMetricTableMatrix,
  filterMonitorMetricTableMatrix
} from '../../lib/monitor-detail/view-model';
import type { MonitorRealtimeMetricData } from '../../lib/types';
import { MonitorMetricTable } from './monitor-metric-table';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function Surface({
  payload,
  selectedRowKey,
  mode,
  compact = false,
  showExpandControl = true,
  onSelect,
  onModeChange,
  onRefresh,
  onToggleExpanded,
  formatTime,
  t
}: {
  payload: MonitorRealtimeMetricData | null | undefined;
  selectedRowKey: string | null;
  mode: 'table' | 'detail';
  compact?: boolean;
  showExpandControl?: boolean;
  onSelect: (key: string) => void;
  onModeChange: (mode: 'table' | 'detail') => void;
  onRefresh: () => void;
  onToggleExpanded: () => void;
  formatTime: (value?: number | string | null) => string;
  t: Translator;
}) {
  const [rowSearch, setRowSearch] = useState('');
  const filteredMatrix = useMemo(
    () => filterMonitorMetricTableMatrix(buildMonitorMetricTableMatrix(payload, t), rowSearch),
    [payload, rowSearch, t]
  );

  useEffect(() => {
    if (filteredMatrix.rows.length === 0) return;
    if (!selectedRowKey || !filteredMatrix.rows.some(row => row.key === selectedRowKey)) {
      onSelect(filteredMatrix.rows[0].key);
    }
  }, [filteredMatrix.rows, onSelect, selectedRowKey]);

  const selectedRowIndex = selectedRowKey == null ? null : Number(selectedRowKey);
  const factRows = buildMonitorMetricRealtimeFactRows(payload, t, formatTime);
  const selectedRowRows = buildMonitorMetricSelectedRowRows(payload, selectedRowIndex, t);
  const visibleFactRows = compact ? factRows.slice(0, 1) : factRows;
  const selectedRow = selectedRowKey == null ? null : filteredMatrix.rows.find(row => row.key === selectedRowKey) ?? null;
  const selectedVisibleIndex = selectedRowKey == null ? null : filteredMatrix.rows.findIndex(row => row.key === selectedRowKey);
  const selectedLabelCount =
    selectedRowIndex != null && payload?.valueRows?.[selectedRowIndex]?.labels
      ? Object.keys(payload.valueRows[selectedRowIndex].labels || {}).length
      : 0;
  const selectedFieldCount =
    selectedRowIndex != null && payload?.fields?.length && payload?.valueRows?.[selectedRowIndex]
      ? payload.fields.length
      : 0;
  const rowNavigation = {
    selectedIndex: selectedVisibleIndex != null && selectedVisibleIndex >= 0 ? selectedVisibleIndex : null,
    total: filteredMatrix.rows.length,
    selectedLabel:
      selectedVisibleIndex != null && selectedVisibleIndex >= 0 ? filteredMatrix.rows[selectedVisibleIndex]?.label || null : null,
    canPrevious: selectedVisibleIndex != null && selectedVisibleIndex > 0,
    canNext: selectedVisibleIndex != null && selectedVisibleIndex < filteredMatrix.rows.length - 1
  };
  return (
    <HzMonitorDetailStage
      title={t('monitor.detail.tab.realtime')}
      header="hidden"
      rhythm="tight"
      data-monitor-surface="realtime-stage"
      data-monitor-surface-owner="hertzbeat-ui-detail-stage"
      data-monitor-surface-compact={compact ? 'true' : undefined}
      data-monitor-surface-compact-layout={compact ? 'flat-inline' : undefined}
      data-monitor-realtime-wrapper={compact ? 'hertzbeat-ui-detail-stage' : undefined}
      data-monitor-realtime-selection-reset="angular-table-reload"
    >
      <HzMonitorRealtimeToolbar
        facts={visibleFactRows}
        compact={compact}
        selectedMode={mode}
        modeOptions={
          compact
            ? []
            : [
                { value: 'table', label: t('monitor.detail.metric.mode.table') },
                { value: 'detail', label: t('monitor.detail.metric.mode.detail') }
              ]
        }
        onModeChange={value => onModeChange(value === 'detail' ? 'detail' : 'table')}
        refreshLabel={compact ? undefined : t('common.refresh')}
        onRefresh={onRefresh}
        expandLabel={showExpandControl ? t('monitor.detail.metric.fullscreen.enter') : undefined}
        onExpand={onToggleExpanded}
        showExpand={showExpandControl}
        data-monitor-surface-compact-toolbar={compact ? 'true' : undefined}
        data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"
      />

      {compact ? null : (
        <MonitorMetricTable
          payload={payload}
          matrix={filteredMatrix}
          selectedRowKey={selectedRowKey}
          onSelect={onSelect}
          mode={mode}
          t={t}
        />
      )}
      {!compact && selectedRow ? (
        <HzMonitorRealtimeInspector
          variant="details"
          label={t('monitor.detail.metric.stats.active-row')}
          value={selectedRow.label}
          stats={[
            { label: t('monitor.detail.metric.stats.fields'), value: String(selectedFieldCount) },
            { label: t('monitor.detail.metric.stats.labels'), value: String(selectedLabelCount) }
          ]}
          rows={selectedRowRows.map(row => ({ label: row.title, value: row.copy, meta: row.meta && row.meta !== '-' ? row.meta : undefined }))}
          data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"
        />
      ) : null}

      {compact ? null : (
        <HzControlStack data-monitor-realtime-search-stack-owner="hertzbeat-ui-control-stack">
          <HzInput
            value={rowSearch}
            onChange={event => setRowSearch(event.target.value)}
            placeholder={t('monitor.detail.metric.rows.search.placeholder')}
            aria-label={t('monitor.detail.metric.rows.search.placeholder')}
            data-monitor-realtime-search-owner="hertzbeat-ui-input"
          />
          <HzDataMetaText
            display="block"
            casing="plain"
            data-monitor-realtime-search-count-owner="hertzbeat-ui-data-meta-text"
          >
            {`${filteredMatrix.rows.length} / ${buildMonitorMetricTableMatrix(payload, t).rows.length} ${t('monitor.detail.metric.rows.search.count')}`}
          </HzDataMetaText>
        </HzControlStack>
      )}

      {filteredMatrix.rows.length === 0 ? (
        <HzInlineFeedback
          tone="neutral"
          title={t('monitor.detail.metric.rows.search.empty.copy')}
          data-monitor-realtime-empty-owner="hertzbeat-ui-inline-feedback"
        />
      ) : null}

      {!compact && rowNavigation.total > 0 && selectedVisibleIndex != null ? (
        <HzMonitorRealtimeRowNavigator
          label={
            rowNavigation.selectedIndex != null
              ? `${t('monitor.detail.metric.row-label')} ${rowNavigation.selectedIndex + 1} / ${rowNavigation.total}${
                  rowNavigation.selectedLabel ? ` · ${rowNavigation.selectedLabel}` : ''
                }`
              : t('monitor.detail.metric.table.empty.copy')
          }
          previousLabel={t('common.previous')}
          nextLabel={t('common.next')}
          canPrevious={rowNavigation.canPrevious}
          canNext={rowNavigation.canNext}
          onPrevious={() =>
            rowNavigation.selectedIndex != null &&
            onSelect(filteredMatrix.rows[Math.max(0, selectedVisibleIndex - 1)]?.key || selectedRowKey || '')
          }
          onNext={() =>
            rowNavigation.selectedIndex != null &&
            onSelect(filteredMatrix.rows[Math.min(filteredMatrix.rows.length - 1, selectedVisibleIndex + 1)]?.key || selectedRowKey || '')
          }
          data-monitor-realtime-row-nav-owner="hertzbeat-ui-row-navigator"
        />
      ) : null}
    </HzMonitorDetailStage>
  );
}

export function MonitorRealtimePanel({
  payload,
  selectedRowKey,
  mode,
  compact = false,
  expanded,
  onSelect,
  onModeChange,
  onRefresh,
  onToggleExpanded,
  formatTime,
  t
}: {
  payload: MonitorRealtimeMetricData | null | undefined;
  selectedRowKey: string | null;
  mode: 'table' | 'detail';
  compact?: boolean;
  expanded: boolean;
  onSelect: (key: string) => void;
  onModeChange: (mode: 'table' | 'detail') => void;
  onRefresh: () => void;
  onToggleExpanded: () => void;
  formatTime: (value?: number | string | null) => string;
  t: Translator;
}) {
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
        selectedRowKey={selectedRowKey}
        mode={mode}
        compact={compact}
        onSelect={onSelect}
        onModeChange={onModeChange}
        onRefresh={onRefresh}
        onToggleExpanded={onToggleExpanded}
        formatTime={formatTime}
        t={t}
      />
      {expanded ? (
        <HzMonitorFullscreenFrame
          ref={dialogRef}
          data-expanded="true"
          title={t('monitor.detail.metric.fullscreen.title')}
          kicker={t('monitor.detail.metric.fullscreen.kicker')}
          closeLabel={t('monitor.detail.metric.fullscreen.exit')}
          onClose={onToggleExpanded}
          closeButtonProps={{
            'data-monitor-realtime-fullscreen-close-owner': 'hertzbeat-ui-button'
          } as React.ButtonHTMLAttributes<HTMLButtonElement>}
          data-monitor-realtime-fullscreen-owner="hertzbeat-ui-fullscreen-frame"
        >
          <Surface
            payload={payload}
            selectedRowKey={selectedRowKey}
            mode={mode}
            showExpandControl={false}
            onSelect={onSelect}
            onModeChange={onModeChange}
            onRefresh={onRefresh}
            onToggleExpanded={onToggleExpanded}
            formatTime={formatTime}
            t={t}
          />
        </HzMonitorFullscreenFrame>
      ) : null}
    </>
  );
}
