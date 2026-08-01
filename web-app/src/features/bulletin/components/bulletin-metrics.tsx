/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page';
import { createBulletinMetricCells } from '../model/bulletin-metrics-model';
import type { BulletinMetricsState } from '../model/bulletin-model';

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
  const cells = createBulletinMetricCells(data);
  if (!cells.length) return <OperationalStatePanel kind="empty" title={t('bulletin.metrics.empty')} />;
  return (
    <div>
      <Typography.Title level={4}>{data.name}</Typography.Title>
      <Table
        rowKey="key"
        pagination={false}
        dataSource={cells}
        scroll={{ x: 820 }}
        columns={[
          { title: t('bulletin.metrics.monitor'), dataIndex: 'monitor' },
          { title: t('bulletin.metrics.host'), dataIndex: 'host' },
          { title: t('bulletin.metrics.metric'), dataIndex: 'metric' },
          { title: t('bulletin.metrics.field'), dataIndex: 'field' },
          {
            title: t('bulletin.metrics.value'),
            render: (_, row) =>
              row.status === 'no-data' ? (
                <Tag>{t('bulletin.metrics.noData')}</Tag>
              ) : (
                <>
                  {row.value}
                  {row.unit ? ` ${row.unit}` : ''}
                </>
              )
          }
        ]}
      />
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
