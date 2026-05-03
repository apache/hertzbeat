'use client';

import React from 'react';
import { ObservabilityBadge, ObservabilityDetailRows, ObservabilityStatGrid, ObservabilityStatusBadge } from '../observability';
import { buildMonitorLabelRows, buildMonitorSummaryMetaRows, buildMonitorSummaryStats } from '../../lib/monitor-detail/view-model';
import type { Monitor } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function MonitorSummaryCard({
  monitor,
  formatTime,
  t
}: {
  monitor: Monitor;
  formatTime: (value?: number | string | null) => string;
  t: Translator;
}) {
  const stats = buildMonitorSummaryStats(monitor, t);
  const metaRows = buildMonitorSummaryMetaRows(monitor, t, formatTime);
  const labelRows = buildMonitorLabelRows(monitor.labels || {}, t);
  const annotationRows = buildMonitorLabelRows(monitor.annotations || {}, t);
  const statusLabel =
    monitor.status === 2
      ? t('monitor.status.down')
      : monitor.status === 1
        ? t('monitor.status.up')
        : t('monitor.status.paused');

  return (
    <div className="monitor-detail-container space-y-3" data-monitor-basic-density="angular-cardless">
      <div className="monitor-basic-info space-y-3 px-2 sm:px-3" data-monitor-basic-content-inset="angular-card-padding">
        <div className="monitor-info-header flex items-center gap-2">
          <div className="monitor-name min-w-0 flex-1 truncate text-[16px] font-semibold leading-6 text-[var(--ops-text-primary)]">
            {monitor.name || t('monitor.detail.title-fallback')}
          </div>
          <ObservabilityStatusBadge
            label={statusLabel}
            tone={monitor.status === 2 ? 'danger' : monitor.status === 1 ? 'success' : 'default'}
          />
        </div>

        <div className="monitor-basic-facts" data-monitor-basic-facts-density="angular-compact">
          <ObservabilityStatGrid items={stats} columns={4} tone="operator" />
        </div>

        <div className="monitor-basic-meta border-t border-[var(--ops-border-color)]" data-monitor-basic-meta-density="angular-rows">
          {metaRows.map(row => (
            <div
              key={`${row.label}-${row.value}`}
              className="monitor-basic-meta__row grid gap-2 border-b border-[var(--ops-border-color)] py-2.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start"
            >
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{row.label}</span>
              <strong className="text-sm font-medium leading-6 text-[var(--ops-text-primary)] sm:text-right">{row.value}</strong>
            </div>
          ))}
          {labelRows.length > 0 ? (
            <div className="monitor-basic-meta__row monitor-basic-meta__row--stacked grid gap-2 border-b border-[var(--ops-border-color)] py-2.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{t('label')}</span>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {labelRows.map(row => (
                  <ObservabilityBadge
                    as="span"
                    key={`${row.title}-${row.copy}`}
                    size="token"
                  >
                    {row.title}: {row.copy}
                  </ObservabilityBadge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {annotationRows.length > 0 ? (
        <div className="monitor-annotations space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]">{t('annotation')}</div>
          <ObservabilityDetailRows tone="operator" rows={annotationRows.map(row => ({ title: row.title, copy: row.copy }))} />
        </div>
      ) : null}
    </div>
  );
}
