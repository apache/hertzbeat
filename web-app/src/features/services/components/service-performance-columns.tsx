/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import type { ServicePerformanceRow } from '../model/service-performance-model';
import type { ServicesActions } from '../model/services-model';
import styles from './services-view.module.css';
export function performanceColumns(
  t: TFunction,
  actions: ServicesActions,
  compact = false,
  sort = 'errorCount'
): ColumnsType<ServicePerformanceRow> {
  const columns: ColumnsType<ServicePerformanceRow> = [
    {
      title: t('services.service'),
      key: 'service',
      ...(compact ? { width: '62%' } : { fixed: 'left' as const, width: 230 }),
      render: (_, row) => performanceIdentity(row, t, actions, compact)
    },
    {
      title: t('services.environment'),
      key: 'env',
      render: (_, row) => row.identity?.deploymentEnvironment ?? row.entity.environment ?? t('services.unknown')
    },
    {
      title: t('services.requests'),
      key: 'requests',
      align: 'right',
      render: (_, row) => performanceValue(row.summary?.requestCount, t)
    },
    {
      title: t('services.errorRequests'),
      key: 'errors',
      align: 'right',
      render: (_, row) => performanceValue(row.summary?.errorCount, t)
    },
    {
      title: t('services.errorRate'),
      key: 'rate',
      align: 'right',
      render: (_, row) => performanceValue(row.summary ? row.summary.errorRate * 100 : null, t, '%')
    },
    {
      title: t('services.latencyP95'),
      key: 'latency',
      align: 'right',
      render: (_, row) => performanceValue(row.summary?.latencyP95Ms, t, ' ms')
    },
    { title: t('services.dataState'), key: 'state', render: (_, row) => t(`services.observation.${row.state}`) }
  ];
  if (!compact) return columns;
  const selected =
    { errorCount: 'errors', errorRate: 'rate', requestCount: 'requests', latencyP95Ms: 'latency', name: 'errors' }[
      sort
    ] ?? 'errors';
  return columns.filter(column => column.key === 'service' || column.key === selected);
}

const performanceValue = (number: number | null | undefined, t: TFunction, suffix = '') =>
  number == null ? (
    <span role="img" aria-label={t('services.unknown')} title={t('services.unknown')}>
      —
    </span>
  ) : (
    `${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`
  );

function performanceIdentity(row: ServicePerformanceRow, t: TFunction, actions: ServicesActions, compact: boolean) {
  const name = row.identity?.serviceName ?? row.entity.name;
  const alias = row.entity.displayName ?? row.entity.name;
  return (
    <>
      <Button
        type="link"
        className={styles.serviceLink ?? ''}
        onClick={() => actions.select(row.entity.id, row.identity ?? undefined)}
      >
        {name}
      </Button>
      {alias !== name && <span className={styles.serviceAlias}>{alias}</span>}
      {compact && (
        <>
          <span className={styles.serviceAlias}>
            {row.identity?.deploymentEnvironment ?? row.entity.environment ?? t('services.unknown')}
          </span>
          <span className={styles.serviceAlias}>{t(`services.observation.${row.state}`)}</span>
        </>
      )}
    </>
  );
}
