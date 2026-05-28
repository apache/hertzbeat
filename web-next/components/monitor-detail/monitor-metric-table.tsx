'use client';

import React from 'react';
import { HzDataMetaText, HzDataTable } from '@hertzbeat/ui';
import { buildMonitorMetricSelectedRowTableRows, buildMonitorMetricTableMatrix, type MonitorMetricTableMatrix } from '../../lib/monitor-detail/view-model';
import type { MonitorRealtimeMetricData } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type MetricMatrixRow = MonitorMetricTableMatrix['rows'][number];
type MetricDetailRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
};

export function MonitorMetricTable({
  payload,
  matrix,
  selectedRowKey,
  onSelect,
  mode = 'table',
  t
}: {
  payload: MonitorRealtimeMetricData | null | undefined;
  matrix?: MonitorMetricTableMatrix;
  selectedRowKey: string | null;
  onSelect: (key: string) => void;
  mode?: 'table' | 'detail';
  t: Translator;
}) {
  const resolvedMatrix = matrix ?? buildMonitorMetricTableMatrix(payload, t);
  if (resolvedMatrix.columns.length === 0 || resolvedMatrix.rows.length === 0) return null;

  if (mode === 'detail') {
    const rowIndex = selectedRowKey == null ? null : Number(selectedRowKey);
    const selectedRow = rowIndex == null ? null : resolvedMatrix.rows.find(row => row.key === selectedRowKey) ?? null;
    const detailRows = buildMonitorMetricSelectedRowTableRows(payload, rowIndex, t);
    const rows: MetricDetailRow[] = [
      {
        key: 'selected-row',
        title: t('monitor.detail.metric.row-label'),
        copy: selectedRow?.label || t('monitor.detail.metric.table.empty.title'),
        meta: ''
      },
      ...detailRows.map((row, index) => ({
        key: `${row.title}-${index}`,
        title: row.title,
        copy: row.copy,
        meta: row.meta
      }))
    ];

    return (
      <div className="min-w-0" data-monitor-metric-detail-owner="hertzbeat-ui-data-table">
        <HzDataTable
          columns={[
            {
              key: 'title',
              header: t('monitor.detail.metric.row-label'),
              width: '180px',
              render: row => <span className="font-semibold">{row.title}</span>
            },
            {
              key: 'copy',
              header: t('monitor.detail.metric.payload.meta'),
              render: row => (
                <span>
                  <span>{row.copy}</span>
                  {row.meta ? (
                    <HzDataMetaText spacing="inline" data-monitor-metric-row-meta-owner="hertzbeat-ui-data-meta-text">
                      {row.meta}
                    </HzDataMetaText>
                  ) : null}
                </span>
              )
            }
          ]}
          rows={rows}
          getRowKey={row => row.key}
          emptyLabel={t('monitor.detail.metric.table.empty.copy')}
        />
      </div>
    );
  }

  const columns = [
    {
      key: 'label',
      header: t('monitor.detail.metric.row-label'),
      render: (row: MetricMatrixRow) => <span className="font-medium">{row.label}</span>
    },
    ...resolvedMatrix.columns.map((column, index) => ({
      key: column.key,
      header: (
        <span>
          <span>{column.title}</span>
          {column.unit ? (
            <HzDataMetaText variant="unit" spacing="compact" data-monitor-metric-unit-owner="hertzbeat-ui-data-meta-text">
              {column.unit}
            </HzDataMetaText>
          ) : null}
        </span>
      ),
      render: (row: MetricMatrixRow) => <span>{row.values[index]}</span>
    }))
  ];

  return (
    <div className="min-w-0" data-monitor-metric-table-owner="hertzbeat-ui-data-table">
      <HzDataTable
        columns={columns}
        rows={resolvedMatrix.rows}
        emptyLabel={t('monitor.detail.metric.table.empty.copy')}
        getRowKey={row => row.key}
        selectedRowKey={selectedRowKey ?? undefined}
        onRowClick={row => onSelect(row.key)}
      />
    </div>
  );
}
