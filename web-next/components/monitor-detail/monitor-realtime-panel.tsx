'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ObservabilityControlButton, ObservabilityDetailRows, ObservabilitySearchInput } from '../observability';
import {
  buildMonitorMetricRealtimeFactRows,
  buildMonitorMetricSelectedRowRows,
  buildMonitorMetricTableMatrix,
  filterMonitorMetricTableMatrix
} from '../../lib/monitor-detail/view-model';
import type { MonitorRealtimeMetricData } from '../../lib/types';
import { MonitorMetricTable } from './monitor-metric-table';
import { MonitorStatGrid } from './monitor-panel-primitives';
import { WorkbenchFullscreenShell } from '../workbench/primitives';

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
  const surfaceClassName = compact
    ? 'monitor-workbench-surface monitor-workbench-surface--plain monitor-realtime-data-table space-y-1 border-t border-[var(--ops-border-color)] pt-1'
    : 'space-y-3';
  const toolbarClassName = compact
    ? 'monitor-workbench-surface__header flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ops-border-color)] pb-2'
    : 'flex flex-wrap items-center justify-between gap-2';

  return (
    <div
      className={surfaceClassName}
      data-monitor-surface="realtime-stage"
      data-monitor-surface-compact={compact ? 'true' : undefined}
      data-monitor-surface-compact-layout={compact ? 'cardless-table' : undefined}
      data-monitor-realtime-wrapper={compact ? 'monitor-data-table' : undefined}
    >
      {compact ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ops-border-color)] pb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('monitor.detail.metric.stage.title')}</div>
            <div className="mt-1 max-w-2xl text-sm text-[var(--ops-text-secondary)]">
              {t('monitor.detail.metric.stage.copy')}
            </div>
          </div>
          <div
            className="border-l border-[var(--ops-border-color)] pl-3 text-right"
            data-monitor-surface-panel="row-inspector"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('monitor.detail.metric.selection.title')}</div>
            <div className="mt-1 text-sm font-semibold text-[var(--ops-text-primary)]">
              {selectedRow ? selectedRow.label : t('monitor.detail.metric.inspector.empty')}
            </div>
          </div>
        </div>
      )}

      <div
        className={toolbarClassName}
        data-monitor-surface-compact-toolbar={compact ? 'true' : undefined}
        data-monitor-realtime-action-band={compact ? 'monitor-data-table' : undefined}
      >
        <div className="flex flex-wrap gap-2" data-monitor-realtime-collect-time={compact ? 'true' : undefined}>
          {visibleFactRows.map(row => (
            <div key={row.title} className="border-b border-[var(--ops-border-color)] px-0 py-1.5 text-xs text-[var(--ops-text-secondary)]">
              <span className="text-[var(--ops-text-tertiary)]">{row.title}</span>
              {' · '}
              <span className="text-[var(--ops-text-primary)]">{row.copy}</span>
            </div>
          ))}
        </div>
        <div
          className="flex flex-wrap gap-2"
          data-monitor-realtime-action-group={compact ? 'metrics-card-extra' : undefined}
          data-monitor-realtime-action-density={compact ? 'angular-plain-meta' : undefined}
        >
          {compact ? null : (
            <>
              <ObservabilityControlButton tone="operator" selected={mode === 'table'} onClick={() => onModeChange('table')}>
                {t('monitor.detail.metric.mode.table')}
              </ObservabilityControlButton>
              <ObservabilityControlButton tone="operator" selected={mode === 'detail'} onClick={() => onModeChange('detail')}>
                {t('monitor.detail.metric.mode.detail')}
              </ObservabilityControlButton>
            </>
          )}
          {!compact ? (
            <ObservabilityControlButton tone="operator" onClick={onRefresh}>{t('common.refresh')}</ObservabilityControlButton>
          ) : null}
          {showExpandControl ? (
            <ObservabilityControlButton
              tone="operator"
              variant={compact ? 'plain' : 'default'}
              className={compact ? 'h-6 px-0 py-0 text-[var(--ops-text-tertiary)]' : undefined}
              data-monitor-realtime-expand-action-density={compact ? 'plain-link' : undefined}
              onClick={onToggleExpanded}
            >
              {t('monitor.detail.metric.fullscreen.enter')}
            </ObservabilityControlButton>
          ) : null}
        </div>
      </div>

      {compact ? null : (
        <div className="border-y border-[var(--ops-border-color)] py-2">
          <MonitorMetricTable
            payload={payload}
            matrix={filteredMatrix}
            selectedRowKey={selectedRowKey}
            onSelect={onSelect}
            mode={mode}
            t={t}
          />
        </div>
      )}
      {!compact && selectedRow ? (
        <div className="space-y-3 border-y border-[var(--ops-border-color)] py-3" data-monitor-surface-panel="row-inspector">
          <MonitorStatGrid
            items={[
              { label: t('monitor.detail.metric.stats.active-row'), value: selectedRow.label },
              { label: t('monitor.detail.metric.stats.fields'), value: String(selectedFieldCount) },
              { label: t('monitor.detail.metric.stats.labels'), value: String(selectedLabelCount) }
            ]}
          />
          <ObservabilityDetailRows tone="operator" rows={selectedRowRows} />
        </div>
      ) : null}

      {compact ? null : (
        <div className="space-y-2">
          <ObservabilitySearchInput
            tone="operator"
            value={rowSearch}
            onChange={setRowSearch}
            placeholder={t('monitor.detail.metric.rows.search.placeholder')}
          />
          <div className="text-xs text-[var(--ops-text-tertiary)]">
            {`${filteredMatrix.rows.length} / ${buildMonitorMetricTableMatrix(payload, t).rows.length} ${t('monitor.detail.metric.rows.search.count')}`}
          </div>
        </div>
      )}

      {filteredMatrix.rows.length === 0 ? (
        <div className="border-y border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-2 text-sm text-[var(--ops-text-secondary)]">
          {t('monitor.detail.metric.rows.search.empty.copy')}
        </div>
      ) : null}

      {!compact && rowNavigation.total > 0 && selectedVisibleIndex != null ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[var(--ops-border-color)] px-3 py-2 text-xs text-[var(--ops-text-secondary)]">
          <div>
            {rowNavigation.selectedIndex != null
              ? `${t('monitor.detail.metric.row-label')} ${rowNavigation.selectedIndex + 1} / ${rowNavigation.total}${
                  rowNavigation.selectedLabel ? ` · ${rowNavigation.selectedLabel}` : ''
                }`
              : t('monitor.detail.metric.table.empty.copy')}
          </div>
          <div className="flex flex-wrap gap-2">
            <ObservabilityControlButton
              tone="operator"
              disabled={!rowNavigation.canPrevious}
              onClick={() =>
                rowNavigation.selectedIndex != null &&
                onSelect(filteredMatrix.rows[Math.max(0, selectedVisibleIndex - 1)]?.key || selectedRowKey || '')
              }
            >
              {t('common.previous')}
            </ObservabilityControlButton>
            <ObservabilityControlButton
              tone="operator"
              disabled={!rowNavigation.canNext}
              onClick={() =>
                rowNavigation.selectedIndex != null &&
                onSelect(filteredMatrix.rows[Math.min(filteredMatrix.rows.length - 1, selectedVisibleIndex + 1)]?.key || selectedRowKey || '')
              }
            >
              {t('common.next')}
            </ObservabilityControlButton>
          </div>
        </div>
      ) : null}
    </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,7,10,0.88)] p-4"
          data-expanded="true"
          role="dialog"
          aria-modal="true"
          aria-label={t('monitor.detail.metric.fullscreen.title')}
        >
          <WorkbenchFullscreenShell
            ref={dialogRef}
            tabIndex={-1}
            className="hb-scrollbar max-h-[92vh] w-full max-w-6xl overflow-auto"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('monitor.detail.metric.fullscreen.kicker')}</div>
                <div className="mt-1 text-lg font-semibold text-[var(--ops-text-primary)]">{t('monitor.detail.metric.fullscreen.title')}</div>
              </div>
              <ObservabilityControlButton tone="operator" onClick={onToggleExpanded}>
                {t('monitor.detail.metric.fullscreen.exit')}
              </ObservabilityControlButton>
            </div>
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
          </WorkbenchFullscreenShell>
        </div>
      ) : null}
    </>
  );
}
