/*
 * Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0.
 */

import { Empty, Skeleton, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { AlertRecord } from '@/features/alert';
import { isDashboardFailureState, type DashboardRecentAlertState } from '../model/dashboard-model';
import styles from './dashboard.module.css';

const previewLimit = 10;

export function DashboardRecentAlertResults({ state }: { state: DashboardRecentAlertState }) {
  const { t } = useTranslation();
  return (
    <section className={styles.recentAlertSection} aria-label={t('dashboard.recentAlerts.title')}>
      <Typography.Title level={4}>{t('dashboard.recentAlerts.title')}</Typography.Title>
      <RecentAlertContent state={state} t={t} />
    </section>
  );
}

function RecentAlertContent({ state, t }: { state: DashboardRecentAlertState; t: TFunction }) {
  if (state.kind === 'loading') return <Skeleton active />;
  if (state.kind === 'empty') return <Empty description={t('dashboard.recentAlerts.empty')} />;
  if (isDashboardFailureState(state)) {
    return (
      <Typography.Text className={styles.summaryStatus ?? ''} type={state.kind === 'error' ? 'danger' : 'secondary'}>
        {t(`dashboard.recentAlerts.states.${state.kind}`)}
      </Typography.Text>
    );
  }
  // Preserve the backend's gmtUpdate-desc evidence; the view only caps the validated first page.
  const records = state.records.slice(0, previewLimit);
  return (
    <>
      <Typography.Text type="secondary">
        {t('dashboard.recentAlerts.preview', { shown: records.length, total: state.total })}
      </Typography.Text>
      <ol className={styles.recentAlertList}>
        {records.map(record => (
          <RecentAlertRow key={record.id} record={record} t={t} />
        ))}
      </ol>
    </>
  );
}

function RecentAlertRow({ record, t }: { record: AlertRecord; t: TFunction }) {
  const name = record.labels?.alertname?.trim() || `#${record.id}`;
  const severity = record.labels?.severity;
  const content = record.content?.trim() || t('dashboard.recentAlerts.noContent');
  return (
    <li className={styles.recentAlertItem}>
      <span className={styles.recentAlertTime}>{formatActiveAt(record.activeAt, t)}</span>
      <Tag>{severity ? t(`alert.severity.${severity}`) : t('dashboard.recentAlerts.notReported')}</Tag>
      <Typography.Text strong>{name}</Typography.Text>
      <Typography.Text className={styles.recentAlertContent ?? ''}>{content}</Typography.Text>
    </li>
  );
}

function formatActiveAt(value: number | null, t: TFunction) {
  return value === null
    ? t('dashboard.recentAlerts.notReported')
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}
