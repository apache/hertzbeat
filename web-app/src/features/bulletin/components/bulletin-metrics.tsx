/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Table, Tag, type TableProps } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page';
import { buildMonitorDetailPath } from '@/shared/navigation/app-paths';
import {
  createBulletinMetricPivot,
  type BulletinMetricPivotGroup,
  type BulletinMetricPivotRow
} from '../model/bulletin-metrics-model';
import type { BulletinMetricField, BulletinMetricsState } from '../model/bulletin-model';
import styles from '../bulletin-page.module.css';

export function BulletinMetricsPanel({ state }: { state: BulletinMetricsState }) {
  const { t } = useTranslation();
  if (state.kind === 'idle') return <OperationalStatePanel kind="empty" title={t('bulletin.metrics.select')} />;
  if (state.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('bulletin.metrics.loading')} />;
  if (state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('bulletin.metrics.empty')} />;
  if (state.kind !== 'ready') {
    return (
      <OperationalStatePanel kind={metricsFailureStateKind(state.kind)} title={t(`bulletin.metrics.${state.kind}`)} />
    );
  }
  const data = state.data;
  const pivot = createBulletinMetricPivot(data);
  if (!pivot.rows.length) return <OperationalStatePanel kind="empty" title={t('bulletin.metrics.empty')} />;
  return (
    <Table
      bordered
      rowKey="key"
      pagination={false}
      dataSource={pivot.rows}
      scroll={{ x: 'max-content' }}
      columns={createBulletinMetricColumns(pivot.groups, t)}
    />
  );
}

function createBulletinMetricColumns(
  groups: BulletinMetricPivotGroup[],
  t: TFunction
): NonNullable<TableProps<BulletinMetricPivotRow>['columns']> {
  return [
    {
      title: t('bulletin.metrics.monitor'),
      dataIndex: 'monitor',
      fixed: 'left',
      width: 150,
      align: 'center',
      render: (monitor: string, row) => <Link to={buildMonitorDetailPath(row.monitorId)}>{monitor}</Link>
    },
    { title: t('bulletin.metrics.host'), dataIndex: 'host', fixed: 'left', width: 170, align: 'center' },
    ...groups.map(group => ({
      title: group.metric,
      align: 'center' as const,
      children: group.fields.map(field => ({
        title: field.key,
        key: field.valueKey,
        width: 150,
        align: 'center' as const,
        render: (_: unknown, row: BulletinMetricPivotRow) => (
          <BulletinMetricValues values={row.values[field.valueKey] ?? []} t={t} />
        )
      }))
    }))
  ];
}

function BulletinMetricValues({ values, t }: { values: BulletinMetricField[]; t: TFunction }) {
  if (values.length === 0) return <span aria-label={t('bulletin.metrics.noData')}>—</span>;
  return (
    <div className={styles.metricValues}>
      {values.map((field, index) =>
        field.status === 'no-data' ? (
          <Tag key={index}>{t('bulletin.metrics.noData')}</Tag>
        ) : (
          <span key={index}>
            {field.value}
            {field.unit && <Tag color="success">{field.unit}</Tag>}
          </span>
        )
      )}
    </div>
  );
}

function metricsFailureStateKind(
  kind: 'missing' | 'invalid' | 'permission' | 'unavailable' | 'error'
): OperationalStateKind {
  if (kind === 'permission') return 'permission';
  if (kind === 'unavailable') return 'unavailable';
  return 'error';
}
