'use client';

import React from 'react';
import { HzMonitorBasicSummary, type HzStatusTone } from '@hertzbeat/ui';
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
  const statusTone: HzStatusTone =
    monitor.status === 2 ? 'critical' : monitor.status === 1 ? 'success' : 'neutral';

  return (
    <HzMonitorBasicSummary
      name={monitor.name || t('monitor.detail.title-fallback')}
      statusLabel={statusLabel}
      statusTone={statusTone}
      facts={stats}
      metaRows={metaRows}
      labels={labelRows.map(row => ({ label: row.title, value: row.copy }))}
      annotations={annotationRows.map(row => ({ label: row.title, value: row.copy }))}
      labelHeading={t('label')}
      annotationHeading={t('annotation')}
    />
  );
}
