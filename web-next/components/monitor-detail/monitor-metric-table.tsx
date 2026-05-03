'use client';

import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, ObservabilityDetailRows } from '../observability';
import { buildMonitorMetricSelectedRowTableRows, buildMonitorMetricTableMatrix, type MonitorMetricTableMatrix } from '../../lib/monitor-detail/view-model';
import type { MonitorRealtimeMetricData } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

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

    return (
      <div className="space-y-3 border-y border-[var(--ops-border-color)] py-3">
        <ObservabilityDetailRows
          tone="operator"
          rows={[
            {
              title: t('monitor.detail.metric.row-label'),
              copy: selectedRow?.label || t('monitor.detail.metric.table.empty.title')
            },
            ...detailRows
          ]}
        />
      </div>
    );
  }

  const columns: ColumnDef<(typeof resolvedMatrix.rows)[number], unknown>[] = [
    {
      id: 'label',
      header: t('monitor.detail.metric.row-label'),
      cell: ({ row }) => <span className="font-medium text-[var(--ops-text-primary)]">{row.original.label}</span>
    },
    ...resolvedMatrix.columns.map((column, index) => ({
      id: column.key,
      header: () => (
        <div>
          <div>{column.title}</div>
          {column.unit ? <div className="mt-1 text-[10px] tracking-normal text-[var(--ops-text-tertiary)]">{column.unit}</div> : null}
        </div>
      ),
      cell: ({ row }: { row: { original: (typeof resolvedMatrix.rows)[number] } }) => (
        <span className="text-[var(--ops-text-secondary)]">{row.original.values[index]}</span>
      )
    }))
  ];

  return (
    <DataTable
      columns={columns}
      data={resolvedMatrix.rows}
      emptyState={t('monitor.detail.metric.table.empty.copy')}
      tableOptions={{ getRowId: row => row.key }}
      rowClassName={row => (row.original.key === selectedRowKey ? 'bg-[var(--ops-surface-raised)] shadow-[inset_2px_0_0_var(--ops-primary)]' : undefined)}
      rowAttributes={row => ({
        'data-selected': row.original.key === selectedRowKey ? 'true' : 'false'
      })}
      onRowClick={row => onSelect(row.original.key)}
      className="rounded-none border-x-0 border-y border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]"
    />
  );
}
