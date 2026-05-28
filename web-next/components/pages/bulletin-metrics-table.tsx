'use client';

import Link from 'next/link';
import React from 'react';
import { Badge } from '../ui/badge';
import { buildBulletinMetricCellValues, buildBulletinMetricColumns } from '../../lib/bulletin-center/view-model';
import type { BulletinMetricsData } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function BulletinMetricsTable({
  data,
  app,
  loading,
  error,
  t
}: {
  data: BulletinMetricsData | null;
  app: string;
  loading: boolean;
  error: string | null;
  t: Translator;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-sm text-[var(--ops-text-secondary)]">
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-6 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-6 text-sm text-[var(--ops-text-secondary)]">
        {t('bulletin.metrics.empty.copy')}
      </div>
    );
  }

  const columns = buildBulletinMetricColumns(data, app, t);
  const emptyMetricValue = t('common.none');

  return (
    <div className="overflow-x-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]">
      <table className="min-w-full table-auto border-collapse text-[12px]" data-bulletin-metrics-table="true">
        <thead>
          <tr className="border-b border-[var(--ops-border-color)] text-[var(--ops-text-primary)]">
            <th className="min-w-[180px] px-3 py-2 text-center font-semibold">{t('bulletin.metrics.column.app')}</th>
            <th className="min-w-[180px] px-3 py-2 text-center font-semibold">{t('bulletin.metrics.column.host')}</th>
            {columns.map(column => (
              <th
                key={column.key}
                colSpan={Math.max(column.fields.length, 1)}
                className="border-l border-[var(--ops-border-color)] px-3 py-2 text-center font-semibold"
              >
                {column.label}
              </th>
            ))}
          </tr>
          <tr className="border-b border-[var(--ops-border-color)] text-[var(--ops-text-tertiary)]">
            <th className="px-3 py-2" />
            <th className="px-3 py-2" />
            {columns.flatMap(column =>
              column.fields.map(field => (
                <th key={`${column.key}-${field.key}`} className="border-l border-[var(--ops-border-color)] px-3 py-2 text-center font-medium">
                  {field.label}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {data.content.map(row => {
            const monitorName = row.monitorName || emptyMetricValue;
            const hostName = row.host || emptyMetricValue;

            return (
              <tr key={`${row.monitorId}-${row.host}`} className="border-b border-[var(--ops-border-color)] align-top last:border-b-0">
                <td className="px-3 py-2 text-center">
                  <Link href={`/monitors/${row.monitorId}`} className="font-medium text-[var(--ops-primary)] transition hover:text-[var(--ops-text-primary)]">
                    {monitorName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-center text-[var(--ops-text-secondary)]">{hostName}</td>
                {columns.flatMap(column =>
                  column.fields.map(field => {
                    const values = buildBulletinMetricCellValues(row, column.key, field.key);
                    return (
                      <td key={`${row.monitorId}-${column.key}-${field.key}`} className="border-l border-[var(--ops-border-color)] px-3 py-2">
                        {values.length === 0 ? (
                          <div className="text-center text-[var(--ops-text-tertiary)]">{emptyMetricValue}</div>
                        ) : (
                          <div className="space-y-1.5">
                            {values.map((value, index) =>
                              value.isNoData ? (
                                <div key={`${row.monitorId}-${column.key}-${field.key}-${index}`} className="flex justify-center">
                                  <Badge variant="accent">{t('bulletin.metrics.no-data')}</Badge>
                                </div>
                              ) : (
                                <div
                                  key={`${row.monitorId}-${column.key}-${field.key}-${index}`}
                                  className="flex items-center justify-between gap-2 whitespace-nowrap rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 py-1"
                                >
                                  <span className="text-[var(--ops-text-primary)]">{value.value}</span>
                                  {value.unit ? <Badge variant="success">{value.unit}</Badge> : null}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
